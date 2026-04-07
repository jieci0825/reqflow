import Koa from 'koa'
import Router from '@koa/router'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'

import { registerUserRoutes } from './routes/users.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerErrorRoutes } from './routes/error.js'
import { registerDelayRoutes } from './routes/delay.js'
import { registerFlakyRoutes } from './routes/flaky.js'
import { registerDedupRoutes } from './routes/dedup.js'
import { registerCacheRoutes } from './routes/cache.js'
import { registerRaceRoutes } from './routes/race.js'
import { registerSSERoutes } from './routes/sse.js'

const app = new Koa()
const router = new Router({ prefix: '/api' })

registerUserRoutes(router)
registerAuthRoutes(router)
registerErrorRoutes(router)
registerDelayRoutes(router)
registerFlakyRoutes(router)
registerDedupRoutes(router)
registerCacheRoutes(router)
registerRaceRoutes(router)
registerSSERoutes(router)

app.use(cors())
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

const PORT = 3456
app.listen(PORT, () => {
    console.log(`Playground 服务已启动: http://localhost:${PORT}`)
})
