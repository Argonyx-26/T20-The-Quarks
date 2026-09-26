import type { Transfer } from "../domain";

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
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
    const filled = Math.round((percentage / 100) * 20);
    const empty = Math.max(0, 20 - filled);
    return (
        <span className="font-mono text-ink">
            {Array(filled).fill('█').join('')}{Array(empty).fill('░').join('')} {Math.round(percentage)}%
        </span>
    );
}

export function TransferDashboard({ transfers, online }: { transfers: Transfer[], online: boolean }) {
    const active = transfers.filter(t => ['QUEUED', 'CONNECTING', 'TRANSFERRING', 'COMPLETING'].includes(t.status));
    const completed = transfers.filter(t => t.status === 'COMPLETED');
    const failed = transfers.filter(t => t.status === 'FAILED' || t.status === 'CANCELLED');

    return (
        <div className="flex flex-col h-full bg-base-900 border border-line-soft p-4 overflow-y-auto">
            <div className="mb-6">
                <h3 className="font-mono text-[14px] font-bold text-ink tracking-widest uppercase border-b border-line pb-2 mb-4">MISSION CONTROL</h3>
                
                <h4 className="font-mono text-[10px] text-ink-faint tracking-widest mb-2">SYSTEM</h4>
                <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${online ? 'bg-teal' : 'bg-status-critical'} animate-pulse`}></div>
                    <span className="font-mono text-[12px] text-ink">{online ? 'Online' : 'Offline'}</span>
                </div>
            </div>

            <div className="mb-6">
                <h4 className="font-mono text-[10px] text-ink-faint tracking-widest mb-2 border-b border-line pb-1">ACTIVE TRANSFERS</h4>
                <div className="flex flex-col gap-4">
                    {active.length === 0 && <div className="text-ink-muted text-[11px] font-mono">No active transfers</div>}
                    {active.map(t => (
                        <div key={t.transferId} className="flex flex-col gap-1 border border-line-soft p-3 bg-base-800">
                            <div className="flex justify-between font-mono text-[12px]">
                                <span className="text-ink font-bold">📄 {t.fileName}</span>
                                <span className="text-ink-muted">{formatBytes(t.bytesTransferred)} / {formatBytes(t.totalBytes)}</span>
                            </div>
                            <div className="mt-2 text-[12px]">
                                <ProgressBar percentage={t.percentage} />
                            </div>
                            <div className="flex justify-between font-mono text-[11px] mt-2 text-ink-muted">
                                <span>{formatBytes(t.transferSpeed)}/s • {t.percentage === 100 ? 'Finishing...' : `${formatETA(t.eta)} remaining`}</span>
                                <span>{t.sender} → {t.receiver}</span>
                            </div>
                            <div className="mt-1 font-mono text-[11px] font-bold text-teal">
                                {t.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <h4 className="font-mono text-[10px] text-ink-faint tracking-widest mb-2 border-b border-line pb-1">COMPLETED</h4>
                <div className="flex flex-col gap-2">
                    {completed.length === 0 && <div className="text-ink-muted text-[11px] font-mono">No completed transfers</div>}
                    {completed.map(t => (
                        <div key={t.transferId} className="flex flex-col gap-1 border border-line-soft p-2">
                            <div className="flex justify-between font-mono text-[12px]">
                                <span className="text-teal">✓ {t.fileName}</span>
                                <span className="text-ink-muted">{formatBytes(t.totalBytes)}</span>
                            </div>
                            <div className="font-mono text-[10px] text-ink-muted">
                                Completed {new Date(t.completedAt || t.updatedAt).toLocaleTimeString()} 
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <h4 className="font-mono text-[10px] text-ink-faint tracking-widest mb-2 border-b border-line pb-1">FAILED / INTERRUPTED</h4>
                <div className="flex flex-col gap-2">
                    {failed.length === 0 && <div className="text-ink-muted text-[11px] font-mono">No failed transfers</div>}
                    {failed.map(t => (
                        <div key={t.transferId} className="flex flex-col gap-1 border border-status-critical/30 bg-status-critical/10 p-2">
                            <div className="flex justify-between font-mono text-[12px]">
                                <span className="text-status-critical">✕ {t.fileName}</span>
                                <span className="text-status-critical">{formatBytes(t.bytesTransferred)} / {formatBytes(t.totalBytes)}</span>
                            </div>
                            <div className="font-mono text-[10px] text-status-critical">
                                Connection lost at {Math.round(t.percentage)}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
