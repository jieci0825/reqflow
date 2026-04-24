# 核心概念

## 架构设计
如果团队内部没有一套成熟的请求层方案，我们在做项目时，通常都会从 `axios` 起步，再基于它做一层二次封装。而借助 `axios` 本身的拦截器，像自动携带 `token`、统一处理响应、集中处理错误这类能力，都可以很快搭起来，可以说是非常方便了。

不过，项目一旦往前走，请求层往往就不只是“把请求发出去”这么简单了。我们会继续往里加一些更上层的通用能力，比如请求重试、请求缓存、重复请求控制，甚至插件化扩展。

而实现这些更上层的能力之后，看起来一切都是那么的美好，不过在这美好之下，存在一个隐式的缺陷，即目前的方案是基于 `axios` 深度绑定的。那么这个问题是一个很大的问题吗？说是致命倒是过于绝对，毕竟对大多数项目来说，这样做完全够用，而且底层请求库通常也不会轻易更换，所以它并不是一种“错误的方案”。

只是随着项目继续发展，你可能会希望同一套请求层支持更多场景：比如浏览器端、服务端渲染、边缘环境，或者在测试里替换成一个更轻量的 mock 实现。这个时候麻烦就出现了。因为重试、缓存、取消请求、错误分类这些原本应该属于“通用请求能力”的东西，其实早就已经写死在 `axios` 的模型里了。

而这个场景暴露的其实就不再是“要不要换库”这么简单，而是只要底层实现一变化，整套上层能力都得跟着调整。原来依赖拦截器的逻辑要改，原来基于 `AxiosError` 的判断要改，测试里的 mock 方式也要改。换句话说，切换到底层实现并不是问题本身，它只是把这种耦合更明显地暴露了出来。

所以从一个基建长远的角度看，我们更希望把两件事拆开来看：

- 一部分是“请求层应该具备哪些通用能力”；
- 另一部分是“请求最终由谁来发、底层怎么发”。

前者交给 `request-core`，后者交给 `adapter`。

在拆分之前，整体关系大致是：`business（API-上层） -> request（请求库封装-下层）`。

拆分之后，则变成：`business（API-上层） -> request-core（请求核心封装-抽象层） -> adapter（适配器-下层）`。

这样一来，`request-core` 就不需要直接关心底层到底是 `axios`、`fetch`，还是别的实现。它更关注的是统一的调用方式、请求流程的组织，以及重试、缓存、中间件、插件等上层能力。

至于真正的请求如何发送、响应结果如何适配，这些事情都交给 `adapter` 去完成。`adapter` 内部怎么实现，`request-core` 并不关心；`request-core` 只关心一件事：我按照约定传入参数，就应该拿到一份稳定、统一的结果。

这种架构就是 **依赖倒置原则（DIP）**，即 **高层模块不应该依赖低层模块，二者都应该依赖抽象层**，在这里 `request-core` 就是这个抽象层。
- 上层（business）---依赖-> request-core
- 下层（adapter）---实现-> request-core

## request-core
前面我们已经把职责拆开了：`request-core` 负责抽象和流程组织，`adapter` 负责真正发请求。接下来，就顺着这个思路，看看 `request-core` 是怎么是如何实现的。

当然，我们不可能一开始就直接来赘述内部实现，先看看它提供怎样的使用方式，这一步也是非常重要的一步，且个人喜好偏重，按照我个人的习惯来说，一个比较顺手的写法如下：

```ts
const request = createRequest({
    adapter: fetchAdapter(),
    baseURL: 'https://example.com',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
    // 鉴权、重试、缓存、错误处理等更上层能力，交给插件来组织
    plugins: [pluginA(), pluginB(), pluginC()],
})
```

这段代码里，其实藏着两个设计。

- 外部最好只面对一个统一入口，也就是 `createRequest`。
- 像重试、缓存、鉴权、错误处理这类能力，不直接揉进 `adapter` 内部，而是通过插件来扩展。

也正因为如此，`createRequest` 本身的实现其实很简单。它更像一个入口函数，真正负责管理配置、初始化插件、发起请求的，是内部的 `RequestEngine`，如下：

```ts
/** 创建请求引擎实例，接收全局配置并初始化插件系统 */
export function createRequest(config: GlobalConfig): RequestClient {
    return new RequestEngine(config)
}
```

所以如果把 `createRequest` 看作对外暴露的入口，那么 `RequestEngine` 才是真正干活的地方。像 `baseURL`、`headers`、`timeout` 这些配置，基本都是按常规方式做合并，不值一提，真正值得展开说的，是 `plugins` 这一项配置。

在 `request-core` 里，我参考了 Koa 的洋葱模型，用中间件来组织整个请求流程。不过这里有一点需要先说清楚：插件并不等于中间件，但插件会在初始化阶段注册中间件。换句话说，中间件负责“请求经过时要做什么”，插件负责“把这些能力以更易维护的方式装配进去”。

先看一下插件大概长什么样：

::: code-group
```ts [函数签名]
function plugin(options: any): Plugin {
    return {
        name: 'plugin-name',
        setup: ctx => {
            // ...
        },
    }
}
```

```ts [Plugin 类型]
/** 插件是中间件的高级抽象，可在 setup 阶段注册中间件并访问引擎上下文 */
export interface Plugin {
    /** 插件唯一标识名称 */
    name: string
    /** 引擎初始化时调用，用于注册中间件和读取配置 */
    setup(ctx: PluginContext): void
}
```
:::

可以把 `setup` 理解成插件的“安装阶段”。`RequestEngine` 初始化时，会遍历 `plugins`，依次调用每个插件的 `setup`，并把引擎上下文传进去。插件如果需要参与请求流程，就在这里通过 `ctx.useMiddleware` 把中间件挂进去。伪代码大致如下：
```ts
const ctx: PluginContext = {
    useMiddleware: (middleware: Middleware) => {
        this.middlewares.push(middleware)
    },
    ...
}

if (config.plugins) {
    for (const plugin of config.plugins) {
        plugin.setup(ctx)
    }
}
```

这样组织之后，整体流程就会比较清晰：外部通过 `createRequest` 创建实例，`RequestEngine` 在初始化时完成插件装配，插件再把各自的中间件注册进去。插件数组的先后顺序，也就对应着中间件的注册顺序。等真正发起请求时，请求会统一经过这条中间件管线，最后再交给 `adapter` 去发送。

这样做的好处也很直接。像鉴权、重试、缓存、错误处理这类能力，都可以作为独立插件存在。它们既不会直接压进业务代码里，也不用和某个具体适配器死死绑在一起。而且一旦某一层决定提前返回，也可以直接在中间件里完成短路，不必每次都走到底层请求。
