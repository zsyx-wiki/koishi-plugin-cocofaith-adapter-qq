const test = require('node:test')
const assert = require('node:assert/strict')
const qq = require('../lib/index.js')

function groupSession(content = '/信仰 信息') {
  return {
    platform: 'qq', isDirect: false, userId: 'fallback-member', guildId: 'fallback-group', channelId: 'group-1',
    selfId: 'bot', content, stripped: { content }, messageId: 'message-1', timestamp: Date.now(),
    qq: { id: 'event-1', d: { group_openid: 'group-openid', member_openid: 'member-openid' } },
    bot: { sid: 'qq:test', internal: {} }, send: async () => {},
  }
}

test('QQ group identity uses group_openid and member_openid from qq.d', () => {
  assert.deepEqual(qq.qqbotIdentity(groupSession()), {
    adapter: 'qqbot', type: 'qqbot_member_openid', value: 'member-openid', scope: 'group_chat', scopeValue: 'group-openid',
  })
})

test('QQ command content removes bot mention and normalizes full-width slash', () => {
  const session = groupSession('<at id="bot"/> ／虚空祈求 10')
  session.stripped.content = ''
  assert.equal(qq.normalizeQqContent(session), '/虚空祈求 10')
})

test('specific not-found business messages are not hidden by the adapter', () => {
  assert.equal(qq.friendlyBusinessError({ code: 'NOT_FOUND', message: '没有可出售的 C 级物品。' }), '没有可出售的 C 级物品。')
})

test('panel contains Faith tree before Void Prayer tree and remains below official limit', () => {
  assert.ok(qq.FAITH_QQ_PANEL_COMMANDS.length <= 20)
  assert.deepEqual(qq.FAITH_QQ_PANEL_COMMANDS.map((item) => item[0]), [
    '信仰', '信仰 信息', '信仰 注册', '信仰 弃誓', '信仰 职业', '信仰 变更职业',
    '信仰管理 数值', '虚空祈求', '虚空祈求 次数',
  ])
})

test('QQ group messages require an explicit mention while private messages do not', () => {
  const session = groupSession('信仰 信息')
  session.stripped.appel = false
  assert.equal(qq.isQqAddressed(session), false)
  session.stripped.appel = true
  assert.equal(qq.isQqAddressed(session), true)
  session.isDirect = true
  session.stripped.appel = false
  assert.equal(qq.isQqAddressed(session), true)
})

test('QQ session resolves UID, dispatches normalized event and renders result', async () => {
  const session = groupSession('/虚空祈求 2')
  let event, sent
  const ctx = {
    faithCore: { adapter: { resolve: async (identity) => { assert.equal(identity.value, 'member-openid'); return 10000001 } } },
    faithBusiness: { dispatch: async (value) => { event = value; return { matched: true, business: 'void_prayer', command: 'void_prayer', result: { type: 'text', content: '完成' } } } },
  }
  const sender = { sendText: async () => {}, sendResult: async (_session, result) => { sent = result } }
  assert.equal(await qq.dispatchQqSession(ctx, session, sender), true)
  assert.equal(event.uid, 10000001)
  assert.equal(event.content, '/虚空祈求 2')
  assert.equal(event.scene, 'group')
  assert.deepEqual(sent, { type: 'text', content: '完成' })
})

test('Markdown sender uses passive reply metadata and falls back to text on API failure', async () => {
  const payloads = [], fallback = []
  const ctx = { logger: () => ({ warn() {} }) }
  const sender = new qq.QqMessageSender(ctx)
  const session = groupSession()
  session.bot.internal.sendMessage = async (_channel, payload) => payloads.push(payload)
  session.send = async (content) => fallback.push(content)
  await sender.sendText(session, '金币 *100*')
  assert.equal(payloads[0].msg_id, 'message-1')
  assert.equal(payloads[0].msg_seq, 1)
  assert.equal(payloads[0].markdown.content, '<@member-openid>\n金币 \\*100\\*')
  assert.equal(qq.compactMarkdown('金币：100\n登神分：20'), '**金币** · 100\n**登神分** · 20')
  const failedSession = groupSession()
  failedSession.bot.internal.sendMessage = async () => { throw new Error('api failure') }
  failedSession.send = async (content) => fallback.push(content)
  await new qq.QqMessageSender(ctx).sendText(failedSession, '降级')
  assert.equal(fallback.length, 1)
  assert.equal(Array.isArray(fallback[0]), true)
})

test('missing QQ timestamp still permits an immediate passive reply', async () => {
  const payloads = []
  const sender = new qq.QqMessageSender({ logger: () => ({ warn() {} }) })
  const session = groupSession()
  delete session.timestamp
  session.bot.internal.sendMessage = async (_channel, payload) => payloads.push(payload)
  await sender.sendText(session, '收到')
  assert.equal(payloads.length, 1)
  assert.equal(payloads[0].msg_id, 'message-1')
})

test('expired replies are discarded unless Business and Adapter both allow proactive delivery', async () => {
  const payloads = []
  const ctx = { logger: () => ({ warn() {} }) }
  const session = groupSession()
  session.timestamp = Date.now() - 6 * 60 * 1000
  session.bot.internal.sendMessage = async (_channel, payload) => payloads.push(payload)
  session.send = async () => { throw new Error('expired reply must not use generic send') }
  await new qq.QqMessageSender(ctx, false).sendResult(session, { type: 'text', content: '普通结果' })
  await new qq.QqMessageSender(ctx, false).sendResult(session, { type: 'text', content: '强主动', delivery: 'proactive-required' })
  assert.equal(payloads.length, 0)
  await new qq.QqMessageSender(ctx, true).sendResult(session, { type: 'text', content: '强主动', delivery: 'proactive-required' })
  assert.equal(payloads.length, 1)
  assert.equal(payloads[0].event_id, 'event-1')
  assert.equal(payloads[0].msg_id, undefined)
})
