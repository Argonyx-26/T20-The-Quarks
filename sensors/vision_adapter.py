"""VisionAdapter -- minimum viable live feature: webcam -> person presence ->
restricted zone association -> Vision Event.

Deliberately NOT doing: facial recognition, identity tracking, emotion
detection, weapon recognition, custom ML training.

Detector selection is defensive: some opencv-python builds ship without
the classic `objdetect` HOGDescriptor/CascadeClassifier APIs at the top
level (observed on opencv-python 5.0.0 -- `cv2.HOGDescriptor` and
`cv2.objdetect` are both simply absent, no compile flag or extra
dependency brings them back). Rather than pin to a specific opencv-python
version forever, this adapter detects what's available at start() and
degrades:

  1. HOG people detector (opencv-python builds that still ship objdetect):
     highest-confidence, class-specific detection.
  2. Frame-difference motion detector (needs nothing but core cv2): weaker
     evidence -- it reports motion, not confirmed "this is a person" -- so
     it honestly labels itself as such in attributes/evidence rather than
     borrowing HOG's confidence range.

Privacy: frames are processed in-process and discarded either way. Evidence
carries only detection metadata (never raw image bytes or a saved frame).
"""
from __future__ import annotations

from typing import Optional

from .common.adapter import SensorAdapter
from .common.client import BackendClient
from . import config


class VisionAdapter(SensorAdapter):
    source = "vision"

    def __init__(
        self,
        client: BackendClient,
        asset_id: str,
        zone_id: Optional[str] = None,
        camera_index: Optional[int] = None,
    ):
        super().__init__(client, asset_id, zone_id)
        self.camera_index = camera_index if camera_index is not None else config.VISION_CAMERA_INDEX
        self._cap = None
        self._hog = None
        self._cv2 = None
        self._mode: Optional[str] = None  # "hog" | "motion_diff"
        self._prev_gray = None

    def start(self) -> None:
        import cv2  # local import: keep this an optional dependency

        self._cv2 = cv2
        self._cap = cv2.VideoCapture(self.camera_index)
        if not self._cap.isOpened():
            self._cap.release()
            self._cap = None
            raise RuntimeError(f"camera index {self.camera_index} could not be opened")

        if hasattr(cv2, "HOGDescriptor"):
            self._hog = cv2.HOGDescriptor()
            self._hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            self._mode = "hog"
        else:
            self._mode = "motion_diff"
            self._prev_gray = None

        self._running = True
        self._degraded = self._mode != "hog"

    def stop(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        self._running = False

    def poll_once(self) -> Optional[dict]:
        if self._cap is None:
            raise RuntimeError("adapter not started")

        ok, frame = self._cap.read()
        if not ok:
            raise RuntimeError("camera read failed")

        if self._mode == "hog":
            return self._poll_hog(frame)
        return self._poll_motion_diff(frame)

    def _poll_hog(self, frame) -> Optional[dict]:
        cv2 = self._cv2
        small = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
        rects, weights = self._hog.detectMultiScale(small, winStride=(8, 8), scale=1.05)
        if len(rects) == 0:
            return None

        max_weight = float(max(weights)) if len(weights) else 0.0
        # HOG SVM decision values for people typically fall in ~0.3-2.0; squash
        # into a bounded [0.4, 0.95] confidence rather than presenting a raw
        # unbounded score as a probability.
        confidence = round(min(0.95, max(0.4, 0.4 + max_weight / 4.0)), 2)

        return self.emit(
            event_type="person_in_restricted_zone",
            severity=55,
            confidence=confidence,
            attributes={"person_count": int(len(rects)), "camera_index": self.camera_index},
            evidence={"detector": "opencv_hog_people", "note": "no frame retained"},
        )

    def _poll_motion_diff(self, frame) -> Optional[dict]:
        cv2 = self._cv2
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        if self._prev_gray is None:
            self._prev_gray = gray
            return None

        diff = cv2.absdiff(self._prev_gray, gray)
        self._prev_gray = gray
        motion_ratio = float((diff > 25).mean())

        if motion_ratio < 0.02:  # ~2% of pixels changed -- treat as noise floor
            return None

        # Deliberately lower and narrower than HOG's range: this is evidence
        # of *motion*, not a confirmed person classification.
        confidence = round(min(0.75, 0.35 + motion_ratio * 4), 2)

        return self.emit(
            event_type="person_in_restricted_zone",
            severity=50,
            confidence=confidence,
            attributes={
                "detector_mode": "motion_diff_fallback",
                "motion_ratio": round(motion_ratio, 4),
                "camera_index": self.camera_index,
            },
            evidence={
                "detector": "frame_diff_motion",
                "note": "HOGDescriptor unavailable in this opencv-python build; "
                "reports motion, not a confirmed person classification",
            },
        )

    def emit_manual_trigger(self) -> dict:
        """Operator-triggered fallback for when no camera is available.
        Still flows through the same emit() -> canonical Event path; the
        attributes honestly record that this was a manual trigger, not a
        camera detection.
        """
        return self.emit(
            event_type="person_in_restricted_zone",
            severity=55,
            confidence=0.8,
            attributes={"person_count": 1, "trigger": "manual_operator_input"},
            evidence={"detector": "manual_fallback", "note": "camera unavailable"},
        )
