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

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'dsh-env-manager',
          order: 5,
        }, EnvManagerIcon));
      },
    };
  },
});
