import { defineConfig } from 'vitepress'

export default defineConfig({
  // Disable dead link checking (internal docs reference future sections)
  ignoreDeadLinks: true,

  title: 'Multi-Agent Drama System',
  description: 'A shared-blackboard multi-agent drama orchestration system',

  // Ignore dead links during build (some internal docs reference future pages)
  markdown: {
    theme: {
      light: { color: { c: { 1: '#000000', 2: '#5c5c5c', 3: '#8a8a8a' } } }
    }
  },

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/index' },
      { text: 'User Guide', link: '/user-guide/sessions' },
      { text: 'Architecture', link: '/architecture/overview' },
      {
        text: 'GitHub',
        link: 'https://github.com/abchbx/drama'
      }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'Concepts', link: '/guide/concepts' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: '/api/index' },
          { text: 'Authentication', link: '/api/authentication' },
          { text: 'Sessions', link: '/api/sessions' },
          { text: 'Blackboard', link: '/api/blackboard' },
          { text: 'Agents', link: '/api/agents' },
          { text: 'Endpoints', link: '/api/endpoints' }
        ]
      },
      {
        text: 'User Guide',
        items: [
          { text: 'Session Management', link: '/user-guide/sessions' },
          { text: 'Configuration', link: '/user-guide/configuration' },
          { text: 'Export', link: '/user-guide/export' },
          { text: 'Troubleshooting', link: '/user-guide/troubleshooting' }
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Overview', link: '/architecture/overview' },
          { text: 'Components', link: '/architecture/components' },
          { text: 'Data Flow', link: '/architecture/data-flow' }
        ]
      }
    ],

    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                }
              }
            }
          }
        }
      }
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/abchbx/drama' }
    ]
  },

  markdown: {}

})
