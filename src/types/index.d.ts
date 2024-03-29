/* Structure of JSON file with bot token */
export interface AuthJson {
    TOKEN: string;
}

/* Structure of JSON file with bot config */
export interface ConfigJson {
    CLIENT_ID: string;
    GUILD_ID?: string;
    DATA_DIR: string;
}

export interface Event {
    name: string;
    offsetHr: number;
    intervalHr: number;
    lengthHr: number;
    region: string;
    color: number;
}
