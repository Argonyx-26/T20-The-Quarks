import { useMissionControlContext } from "../../MissionControlContext";

function formatBytes(bytes: number, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatETA(seconds: number) {
    if (seconds === 0) return "Calculating...";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
}

function ProgressBar({ percentage }: { percentage: number }) {
    const filled = Math.round((percentage / 100) * 16);
    const empty = Math.max(0, 16 - filled);
    return (
        <span className="font-mono text-ink text-[10px]">
            {Array(filled).fill('█').join('')}{Array(empty).fill('░').join('')} {Math.round(percentage)}%
        </span>
    );
}

export function LiveTransfersWidget() {
    const mc = useMissionControlContext();
    const active = mc.transfers.filter(t => ['QUEUED', 'CONNECTING', 'TRANSFERRING', 'COMPLETING'].includes(t.status));

    if (active.length === 0) {
        return null;
    }

    return (
        <div className="absolute right-0 top-10 z-20 w-80 bg-base-900 border border-line-soft p-4 shadow-2xl backdrop-blur-md">
            <h4 className="font-mono text-[10px] text-ink-faint tracking-widest mb-3 flex justify-between">
                <span>LIVE TRANSFERS</span>
                <span className="text-teal animate-pulse">●</span>
            </h4>
            
            <div className="flex flex-col gap-3">
                {active.slice(0, 3).map(t => (
                    <div key={t.transferId} className="flex flex-col gap-1">
                        <div className="flex justify-between font-mono text-[11px]">
                            <span className="text-ink truncate max-w-[150px]">{t.fileName}</span>
                        </div>
                        <ProgressBar percentage={t.percentage} />
                        <div className="flex justify-between font-mono text-[10px] text-ink-muted">
                            <span>{formatBytes(t.transferSpeed)}/s</span>
                            <span>{t.percentage === 100 ? 'Finishing...' : `ETA ${formatETA(t.eta)}`}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
