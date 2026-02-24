export interface SlackUser {
    id: string;
    deleted?: boolean;
    is_bot?: boolean;
    profile: {
        image_512?: string;
        image_192?: string;
        real_name?: string;
    };
}
