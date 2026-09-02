const FRIENDLY_ERRORS: Readonly<Record<string, string>> = Object.freeze({
  UNREGISTERED: "你尚未注册，只能使用“信仰 注册 [信仰名]”。",
  INVALID_INPUT: "命令参数不正确，请检查格式后重试。",
  NOT_FOUND: "没有找到对应的数据或玩法。",
  NOT_ALLOWED: "当前身份或场景不能执行这个操作。",
  INSUFFICIENT_RESOURCE: "你的金币或相关资源不足。",
  LIMIT_REACHED: "今天的使用次数已经达到上限。",
  CONFLICT: "数据刚刚发生变化，请重试一次。",
  MODULE_DISABLED: "该玩法当前没有启用。",
  MODULE_NOT_READY: "该玩法正在启动，请稍后重试。",
  COMMAND_SCENE_FORBIDDEN: "这个命令不能在当前聊天场景使用。",
  COMMAND_INCOMPLETE: "命令不完整，请选择具体子命令。",
  INTERNAL_ERROR: "处理命令时发生问题，请稍后重试。",
});
export function friendlyBusinessError(error: { code: string; message: string }) {
  if (["INSUFFICIENT_RESOURCE", "LIMIT_REACHED", "UNREGISTERED", "INVALID_INPUT", "NOT_FOUND"].includes(error.code) && error.message) return error.message;
  return FRIENDLY_ERRORS[error.code] ?? error.message ?? FRIENDLY_ERRORS.INTERNAL_ERROR;
}
