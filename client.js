window.__ModuleLoader__.load({
  id: 'dsh-env-manager',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function EnvManagerIcon() {
      return h('svg', {
        viewBox: '0 0 64 64',
        width: 48,
        height: 48,
        'aria-hidden': true,
        style: { display: 'block', pointerEvents: 'none' },
      }, [
        h('circle', { key: 'bg', cx: 32, cy: 32, r: 28, fill: '#0ea5e9' }),
        h('path', {
          key: 'server',
          d: 'M22 20h20v8H22zm0 14h20v8H22z',
          fill: '#ffffff',
        }),
      ]);
    }

    function Panel() {
      return h('section', {
        style: { padding: 24, fontFamily: 'inherit' },
      }, [
        h('h2', { key: 'title', style: { margin: '0 0 8px', fontSize: 18 } }, 'DSH Environment Manager'),
        h('p', { key: 'body', style: { margin: 0, opacity: 0.7 } },
          'Environment registry, service catalog and operation-to-Skill routing.'),
      ]);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'dsh-env-manager',
          order: 40,
          label: 'Environment Manager',
        }, EnvManagerIcon));
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'dsh-env-manager',
        }, Panel));
      },
    };
  },
});
