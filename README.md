# vscode-stylelint-stzhang

此`VSCode`插件`stylelint-stzhang`直接 Fork 于`VSCode`官方插件[shinnn.stylelint](https://github.com/shinnn/vscode-stylelint)。所以，`stylelint-stzhang`继承了`shinnn.stylelint`所有功能。但是，我又贡献了三个新功能（正在申请向`shinnn.stylelint`合并）。

## 增强这款插件的动机

在技术圈，自古都有“工欲善其事，必先利其器”的説法。而就`H5`生态圈可而，`ESLint`与各种开发工具的集成已经达到了极致。让我等前端开发者每天享受生活般地编写着`js`代码。一直以来，我似乎仅只使用工具、专注业务、改善流程，提高效率；而从来就没有为`js`静态代码检查的配置与集成走过心、费过神。

但是，针对各类样式文件（从最基本的`.css`，到工程化程度高一些的`.less`与`.scss`，再到静态代码检查的恶梦`.vue`），我可真是犯了难。在`stylelint@9.6.0`以前是`stylelint`内核本身对`.vue`不友好（需要额外安装`stylelint-processor-html`插件），我忍了。反正，我也搞不定，不忍也不行。

如今，`stylelint@9.7.1`对`VUE`的支持已经无缝。但是，`stylelint`与我日常使用的`IDE`还有诸多不配套。这干扰了我愉悦的工作心情、拖累了我的工作进展、降低我对我的代码质量的保障。这，我可就不能忍了。

* 一方面，**智能**且顺手的编程工具是我平日里工作效率的重要支撑。包括，高亮提示 与 自动修复。
* 另一方面，以我对`VSCode`源码的了解，这是我的地头儿。在我的地面儿上，我怎么还能怂了呢？

于是，自己动手丰衣足食，从`github`上`fork`源码，修`bugs`，加`features`。直至令（我）满意为止（历时两个双休日四天）。

> 题外话：国庆节期间，在美国技术圈，由【代码风格违约】导致的命案不会发生在中国，因为我们更重视代码管理，也舍得下功夫改善工具与完善工具。我们不一样。

## 新功能描述

1. 支持`VSCode workspace`工程组模式。即，在一个`VSCode`实例内，同时打开多个相关联的工程开发与查阅。
    1. 官方`shinnn.stylelint`插件总是使用·工程组·中首个工程的·根目录·与·`stylelint`配置·，来载入目标文件和启动`stylelint`语言服务。这会导致：
        1. 要么，目标文件加载失败 - 找错位置了。
        2. 要么，`stylelint`对各种样式文件高亮提示了莫名其妙的语法错误和代码风格不一致 - 静态扫描规则加载乱套了。
    2. 另一方面，`stylelint-stzhang`则是为·工程组·内每一个工程都单独地启动一个专属的`stylelint`语言服务进程。然后，·工程根目录·与·`stylelint`配置·都与专属`stylelint`语言服务进程进行绑定。以避免乱套的发生。
2. 模仿`VSCode`的`ESLint`插件，支持**自动纠错**功能（即，传说中的`autoFix`）。简单地讲，就是在`Ctrl + S`保存样式文件（或`vue`文件）时，由`stylelint`语言服务自动对·代码风格违约（比如，空格与缩进。甚至，十六进制颜色值的大小写）·和·简单语法错误·进行纠正并保存。
    1. 关于【自动纠错】有多么智能，请参阅[stylelint规则](https://stylelint.io/user-guide/rules/)中所有打了`Autofixable`标记的规则。
3. 摒弃了`shinnn.stylelint`作法，同时模仿`ESLint`插件的优秀实践，`stylelint-stzhang`不再把`stylelint`内核直接打包入`VSCode`插件包内。而是，使用工程现场`npm`安装的`stylelint`实例。这样的好处是：
    1. 统一了·`VSCode`开发工具·与·命令行工具·使用的`stylelint`版本。让`VSCode`的工作结果更符合你的直觉预期。
    2. 避免了因为`VSCode stylelint`插件更新不及时造成的`stylelint`版本过低的问题。

## 新`VSCode`配置项

在`VSCode`的工程配置文件`.vscode/settings.json`与工程组配置文件`*.code-workspace`中，添加了两个配置项

### stylelint.autoFix

* 类型：布尔值
* 默认值：`false`
* 功能：是否开启**自动纠错**功能

### stylelint.trace.server

* 类型：枚举
* 枚举值：`verbose`, `messages`, `off`
* 默认值：`off`
* 功能：是否输出·`stylelint`语言服务的运行时日志·到`VSCode`的`stylelint channel`视窗内。

## 插件安装

请直接在`VSCode`应用商城内搜索关键字`stylelint-stzhang`。然后，点击安装即可。简单不？

![安装](https://raw.githubusercontent.com/stuartZhang/vscode-stylelint/master/media/install-1.png)
