/** Durable settings namespace for product-wide GUI onboarding facts. */
export const WELCOME_NOTICE_SETTINGS_NAMESPACE = 'ui-onboarding'

/** Field storing the last welcome notice version the user acknowledged. */
export const WELCOME_NOTICE_ACK_FIELD = 'welcomeNoticeVersion'

/**
 * Bump only when the notice changes materially and every user should see it
 * again. The acknowledgement is compared for exact equality.
 */
export const WELCOME_NOTICE_VERSION = 'workspace-alberta-2026-08-19.1'

/** The complete editable internal-testing notice in both supported GUI locales. */
export const WELCOME_NOTICE_COPY = {
  zh: {
    title: 'WorkspaceAlberta 声明',
    body: 'WorkspaceAlberta 是 Warre & Vavasour 的独立部署，基于 MIT 许可的上游 dsh 插件式智能体运行时。\n\n它不是上游项目的官方产品，也不使用上游商标或图标。',
    continueLabel: '继续',
  },
  en: {
    title: 'WorkspaceAlberta Notice',
    body: 'WorkspaceAlberta is an independent Warre & Vavasour deployment built on the MIT-licensed upstream dsh plugin runtime.\n\nIt is not an official upstream product and does not use upstream trademarks or product icons.',
    continueLabel: 'Continue',
  },
} as const
