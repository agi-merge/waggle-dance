class EventEmitter<T> {
    private listeners: Array<(data: T) => void> = [];

    subscribe(listener: (data: T) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    emit(data: T): void {
        this.listeners.forEach(listener => listener(data));
    }
}

export default EventEmitter;