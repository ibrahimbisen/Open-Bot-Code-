// window.codebot belongs in the application adapter.
export const documentation = "window.codebot";
export const viewport = () => window.innerWidth;
export const platformAction = (props: { codebot: () => void }) => props.codebot();
