export const later = <T>(delay: number, value?: T) => new Promise<T>(resolve => setTimeout(resolve, delay, value));
