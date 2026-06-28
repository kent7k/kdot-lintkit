module.exports = {
  extends: ['stylelint-config-recess-order', 'stylelint-config-standard-scss'],
  rules: {
    'value-keyword-case': null,
    'selector-class-pattern': '^[a-z][a-zA-Z0-9]+$',

   /**
    * Prettier が calc() を「演算子の後で改行」するため、
    * scss/operator-no-newline-after と衝突して --fix が収束しない。
    * → 演算子改行のスタイルは Prettier に委ねる。
    */
   'scss/operator-no-newline-before': null,
   'scss/operator-no-newline-after': null,
  },
  ignoreFiles: [
     '**/{node_modules,dist,build,out,coverage,.next,.turbo,storybook-static}/**',
      "apps/cms/public/monaco/**"
   ],
}
