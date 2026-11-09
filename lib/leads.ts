const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
export const validEmail = (e: string) => e.length <= 254 && EMAIL.test(e);
