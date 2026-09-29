import type { ComparisonInput, EvaluationCatalog, EvaluationRequest, EvaluationResponse, EvaluationState } from './strategyEvaluationProtocol';
interface EvaluationPort {
    postMessage(message: EvaluationRequest): void;
    terminate(): void;
    onmessage: ((event: MessageEvent<EvaluationResponse>) => void) | null;
    onerror: ((event: ErrorEvent) => unknown) | null;
}

/** Keep only the newest draft while loading; ignore stale answers and terminate on close. */
export class StrategyEvaluationClient {
    private ready = false;
    private warning: string | undefined;
    private disposed = false;
    private failure: string | null = null;
    private sequence = 0;
    private latest: { key: string; id: number; input: ComparisonInput } | null = null;
    private port: EvaluationPort;
    private notify: (state: EvaluationState) => void;
    constructor(port: EvaluationPort, catalog: EvaluationCatalog, notify: (state: EvaluationState) => void) {
        this.port = port;
        this.notify = notify;
        port.onmessage = ({ data }) => {
            if (this.disposed) return;
            if (data.type === 'ready') {
                this.ready = true;
                this.warning = data.warning;
                this.flush();
            } else if (data.type === 'error' && (data.id === 0 || data.id === this.latest?.id)) {
                this.fail(data.message);
            } else if (data.type === 'result' && data.id === this.latest?.id) {
                this.notify({ key: this.latest.key, phase: 'ready', comparison: data.comparison, error: null, warning: this.warning });
            }
        };
        port.onerror = () => this.fail('Evaluation could not run. Retry or reopen this page.');
        port.postMessage({ type: 'initialize', catalog });
    }
    compare(key: string, input: ComparisonInput) {
        if (this.disposed) return;
        this.latest = { key, input, id: ++this.sequence };
        if (this.failure) this.fail(this.failure);
        else if (this.ready) this.flush();
        else this.notify({ key, phase: 'loading', comparison: null, error: null });
    }
    private flush() {
        if (!this.latest || this.failure) return;
        this.notify({ key: this.latest.key, phase: 'calculating', comparison: null, error: null, warning: this.warning });
        try { this.port.postMessage({ type: 'compare', id: this.latest.id, input: this.latest.input }); }
        catch { this.fail('Evaluation could not start. Retry evaluation.'); }
    }
    private fail(message: string) {
        if (this.disposed) return;
        this.failure = message;
        this.notify({ key: this.latest?.key ?? '', phase: 'error', comparison: null, error: message });
    }
    dispose() {
        this.disposed = true;
        this.port.onmessage = null;
        this.port.onerror = null;
        this.port.terminate();
    }
}
