declare module '@selfxyz/common/utils/appType' {
  export interface SelfApp {
    appName: string;
    logoBase64: string;
    endpointType: string;
    endpoint: string;
    header: string;
    scope: string;
    sessionId: string;
    userId: string;
    userIdType: string;
    devMode: boolean;
    disclosures: Record<string, unknown>;
  }

  export function getUniversalLink(selfApp: SelfApp): string;
}
