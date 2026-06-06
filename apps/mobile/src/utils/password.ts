export function isValidLoginPassword(password: string) {
  return password.length >= 8 && /[a-z]/.test(password) && /\d/.test(password);
}

export const loginPasswordRuleText = '密码至少 8 位，需包含小写字母和数字。';
