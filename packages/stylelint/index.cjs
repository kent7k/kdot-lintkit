module.exports = {
  extends: ['stylelint-config-recess-order', 'stylelint-config-standard-scss'],
  rules: {
    'value-keyword-case': null,
    'selector-class-pattern': '^[a-z][a-zA-Z0-9]+$',

   /**
    * standard-scss 17 で入った 2 ルールの調整。どちらも実コードでは誤検出になる。
    */

   // -webkit-line-clamp による行数省略には -webkit-box-orient: vertical が今も必須。
   // 外すと省略表示が壊れるため、このプロパティだけ deprecated 判定から外す。
   // (clip -> clip-path のような、素直に置き換えられるものは対象にしない)
   'property-no-deprecated': [true, { ignoreProperties: ['-webkit-box-orient'] }],

   // @mixin の中の & は、include された先で正しい scoping root を持つ。
   // このルールは mixin の外側を見られないので一律に誤検出する。
   'nesting-selector-no-missing-scoping-root': null,

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
