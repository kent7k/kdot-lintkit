module.exports = {
  extends: ['@kent7k/lintkit-stylelint'],
  rules: {
    'no-duplicate-selectors': null,
    // CSS Modules の camelCase とユーティリティの kebab-case を許可
    'selector-class-pattern': [
      '^(?:[a-z][a-z0-9-]*|[a-z][a-zA-Z0-9]+)$',
      { message: 'Use kebab-case or camelCase class names' }
    ]
  }
}
