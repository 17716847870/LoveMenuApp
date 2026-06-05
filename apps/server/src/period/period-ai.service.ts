import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PeriodAiCycleInput = {
  startedOn: string;
  endedOn: string | null;
  cycleLengthDays: number | null;
  periodLengthDays: number | null;
  status: string;
};

export type PeriodAiDailyLogInput = {
  recordDate: string;
  mood: string | null;
  painLevel: number | null;
  flow: string | null;
  bloodColor: string | null;
  bloodClotFlag: boolean | null;
  dischargeType: string | null;
  abdomenPainArea: string | null;
  backPainLevel: number | null;
  breastTendernessLevel: number | null;
  bodyTemperature: string | null;
  sleepQuality: string | null;
  dietStatus: string | null;
  exerciseLevel: string | null;
  stressLevel: number | null;
  weightChangeValue: string | null;
  symptoms: string[];
  abnormalEvent: string | null;
  manualNoteText: string;
};

export type PeriodAiInsightInput = {
  userId: string;
  today: string;
  cycleRecordCount: number;
  recentCycleLengths: number[];
  recentPeriodLengths: number[];
  baseCycleLengthDays: number;
  basePeriodLengthDays: number;
  basePredictedPeriodStartDate: string;
  basePredictedPeriodEndDate: string;
  basePredictedOvulationDate: string;
  basePredictedOvulationWindowStart: string;
  basePredictedOvulationWindowEnd: string;
  baseCurrentCyclePhase: string;
  cycleVariance: number;
  periodVariance: number;
  last30DaySymptomSummary: string;
  last60DayPatternSummary: string;
  missingDataFlag: boolean;
  cycles: PeriodAiCycleInput[];
  dailyLogs: PeriodAiDailyLogInput[];
};

export type PeriodAiSymptomTrend = {
  title: string;
  description: string;
  kind: 'diet' | 'sleep' | 'pain' | 'mood' | 'symptom' | 'general';
  count: number;
};

export type PeriodAiInsight = {
  aiAvailable: boolean;
  adjustedPeriodStartDate: string | null;
  adjustedPeriodEndDate: string | null;
  adjustedOvulationDate: string | null;
  adjustedOvulationWindowStart: string | null;
  adjustedOvulationWindowEnd: string | null;
  adjustedCurrentCyclePhase: string | null;
  confidenceScore: number | null;
  confidenceLevel: 'low' | 'medium' | 'high';
  reasonSummary: string;
  symptomTrends: PeriodAiSymptomTrend[];
  healthTips: string[];
};

type RawPeriodAiInsight = {
  adjustedPeriodStartDate: string;
  adjustedPeriodEndDate: string;
  adjustedOvulationDate: string;
  adjustedOvulationWindowStart: string;
  adjustedOvulationWindowEnd: string;
  adjustedCurrentCyclePhase: 'period' | 'follicular' | 'ovulation' | 'luteal';
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  reasonSummary: string;
  symptomTrends: PeriodAiSymptomTrend[];
  healthTips: string[];
};

const emptyInsight: PeriodAiInsight = {
  aiAvailable: false,
  adjustedPeriodStartDate: null,
  adjustedPeriodEndDate: null,
  adjustedOvulationDate: null,
  adjustedOvulationWindowStart: null,
  adjustedOvulationWindowEnd: null,
  adjustedCurrentCyclePhase: null,
  confidenceScore: null,
  confidenceLevel: 'low',
  reasonSummary: 'AI unavailable, fallback to base prediction',
  symptomTrends: [],
  healthTips: [],
};

const PERIOD_AI_SYSTEM_PROMPT = `
你是 LoveMenu 经期预测功能的 AI 修正层，不是基础预测层，也不是医疗诊断助手。

你的唯一任务：
在系统已经给出的 base prediction 基础上，结合用户最近周期、每日记录和数据质量，做“有限、保守、可解释”的二次修正。

绝对规则：
1. 不允许脱离 base prediction 独立生成日期。
2. 不允许因为单条备注、单次症状或单日状态做大幅修正。
3. 不允许输出疾病诊断、治疗方案、用药建议、怀孕判断或任何确定性医学结论。
4. 不允许把缺失数据、异常数据包装成高置信度。
5. 不允许输出 JSON schema 之外的任何字段。
6. 日期必须是 YYYY-MM-DD，不能使用“今天、明天、下周、月初”等自然语言。

日期修正边界：
1. adjustedPeriodStartDate 只能在 basePredictedPeriodStartDate 的 ±3 天内。
2. adjustedPeriodEndDate 只能在 basePredictedPeriodEndDate 的 ±2 天内。
3. adjustedOvulationDate 只能在 basePredictedOvulationDate 的 ±2 天内。
4. adjustedOvulationWindowStart 和 adjustedOvulationWindowEnd 必须围绕 adjustedOvulationDate 生成，通常为前后 2 天。
5. 如果数据不足、missingDataFlag=true、cycleRecordCount<3、cycleVariance 明显较大，修正幅度最多 ±1 天，必要时保持 base prediction 不变。

置信度规则：
1. cycleRecordCount < 3 时 confidenceLevel 必须是 low，confidenceScore 不得超过 0.69。
2. 周期波动大、经期波动大、近期记录缺失多时，必须降低 confidenceLevel。
3. 只有有效周期充足、波动小、记录较完整时，才允许 high。
4. confidenceScore 必须与 confidenceLevel 匹配：
   - low: 0.00 到 0.69
   - medium: 0.70 到 0.84
   - high: 0.85 到 1.00

修正输出规则：
1. 如果没有充分理由修正某个日期，可以返回与 base prediction 相同的日期。
2. reasonSummary 必须简短解释：参考了哪些数据、为什么修正或为什么不修正。
3. symptomTrends 只能总结用户记录中反复出现或有明显模式的症状/状态。
4. healthTips 必须是温和生活建议，不能包含诊断、处方、治疗承诺。

当数据不足时：
1. 保守或不修正。
2. confidenceLevel 使用 low。
3. reasonSummary 中明确说明“记录不足，结果仅供参考”。

你必须严格输出符合 json_schema 的 JSON 数据。
`.trim();

const dateSchema = {
  type: 'string',
  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  description: '必须是 YYYY-MM-DD 格式的日期。如果不修正，也必须返回对应 base prediction 日期。',
};

@Injectable()
export class PeriodAiService {
  private readonly logger = new Logger(PeriodAiService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateInsight(input: PeriodAiInsightInput): Promise<PeriodAiInsight> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      return emptyInsight;
    }

    const baseUrl = this.configService.get<string>('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1';
    const model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4.1-mini';

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          input: [
            {
              role: 'system',
              content: PERIOD_AI_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: JSON.stringify(input),
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'period_ai_insight',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'adjustedPeriodStartDate',
                  'adjustedPeriodEndDate',
                  'adjustedOvulationDate',
                  'adjustedOvulationWindowStart',
                  'adjustedOvulationWindowEnd',
                  'adjustedCurrentCyclePhase',
                  'confidenceScore',
                  'confidenceLevel',
                  'reasonSummary',
                  'symptomTrends',
                  'healthTips',
                ],
                properties: {
                  adjustedPeriodStartDate: dateSchema,
                  adjustedPeriodEndDate: dateSchema,
                  adjustedOvulationDate: dateSchema,
                  adjustedOvulationWindowStart: dateSchema,
                  adjustedOvulationWindowEnd: dateSchema,
                  adjustedCurrentCyclePhase: {
                    type: 'string',
                    enum: ['period', 'follicular', 'ovulation', 'luteal'],
                  },
                  confidenceScore: { type: 'number', minimum: 0, maximum: 1 },
                  confidenceLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
                  reasonSummary: { type: 'string', minLength: 8, maxLength: 160 },
                  symptomTrends: {
                    type: 'array',
                    maxItems: 3,
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['title', 'description', 'kind', 'count'],
                      properties: {
                        title: { type: 'string', minLength: 2, maxLength: 16 },
                        description: { type: 'string', minLength: 8, maxLength: 90 },
                        kind: {
                          type: 'string',
                          enum: ['diet', 'sleep', 'pain', 'mood', 'symptom', 'general'],
                        },
                        count: { type: 'integer', minimum: 0, maximum: 180 },
                      },
                    },
                  },
                  healthTips: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 4,
                    items: { type: 'string', minLength: 8, maxLength: 80 },
                  },
                },
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        this.logger.warn(`AI period insight failed: ${response.status} ${message.slice(0, 240)}`);
        return emptyInsight;
      }

      const body = (await response.json()) as unknown;
      return this.normalizeInsight(this.extractJsonText(body));
    } catch (error) {
      this.logger.warn(`AI period insight unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return emptyInsight;
    }
  }

  private extractJsonText(body: unknown) {
    if (typeof body === 'object' && body !== null && 'output_text' in body && typeof body.output_text === 'string') {
      return body.output_text;
    }
    const output = typeof body === 'object' && body !== null && 'output' in body ? body.output : null;
    if (Array.isArray(output)) {
      for (const item of output) {
        const content = typeof item === 'object' && item !== null && 'content' in item ? item.content : null;
        if (!Array.isArray(content)) continue;
        for (const part of content) {
          if (typeof part === 'object' && part !== null && 'text' in part && typeof part.text === 'string') {
            return part.text;
          }
        }
      }
    }
    return '';
  }

  private normalizeInsight(value: string): PeriodAiInsight {
    try {
      const parsed = JSON.parse(value) as Partial<RawPeriodAiInsight>;
      if (!isRawPeriodAiInsight(parsed)) {
        this.logger.warn('AI period insight schema normalization failed');
        return emptyInsight;
      }
      return {
        aiAvailable: true,
        adjustedPeriodStartDate: normalizeDate(parsed.adjustedPeriodStartDate),
        adjustedPeriodEndDate: normalizeDate(parsed.adjustedPeriodEndDate),
        adjustedOvulationDate: normalizeDate(parsed.adjustedOvulationDate),
        adjustedOvulationWindowStart: normalizeDate(parsed.adjustedOvulationWindowStart),
        adjustedOvulationWindowEnd: normalizeDate(parsed.adjustedOvulationWindowEnd),
        adjustedCurrentCyclePhase: parsed.adjustedCurrentCyclePhase,
        confidenceScore: clampNumber(parsed.confidenceScore, 0, 1),
        confidenceLevel: parsed.confidenceLevel,
        reasonSummary: parsed.reasonSummary.slice(0, 160),
        symptomTrends: parsed.symptomTrends.slice(0, 3).map((item) => ({
          title: item.title.slice(0, 16),
          description: item.description.slice(0, 90),
          kind: item.kind,
          count: clampNumber(item.count, 0, 180),
        })),
        healthTips: parsed.healthTips.map((item) => item.slice(0, 80)).slice(0, 4),
      };
    } catch {
      return emptyInsight;
    }
  }
}

function normalizeDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizePhase(value: unknown) {
  return value === 'period' || value === 'follicular' || value === 'ovulation' || value === 'luteal' ? value : null;
}

function normalizeTrendKind(value: unknown) {
  return value === 'diet' || value === 'sleep' || value === 'pain' || value === 'mood' || value === 'symptom'
    ? value
    : 'general';
}

function isRawPeriodAiInsight(value: Partial<RawPeriodAiInsight>): value is RawPeriodAiInsight {
  return (
    isDateString(value.adjustedPeriodStartDate) &&
    isDateString(value.adjustedPeriodEndDate) &&
    isDateString(value.adjustedOvulationDate) &&
    isDateString(value.adjustedOvulationWindowStart) &&
    isDateString(value.adjustedOvulationWindowEnd) &&
    Boolean(normalizePhase(value.adjustedCurrentCyclePhase)) &&
    typeof value.confidenceScore === 'number' &&
    (value.confidenceLevel === 'low' || value.confidenceLevel === 'medium' || value.confidenceLevel === 'high') &&
    typeof value.reasonSummary === 'string' &&
    value.reasonSummary.length >= 8 &&
    Array.isArray(value.symptomTrends) &&
    value.symptomTrends.every(isRawSymptomTrend) &&
    Array.isArray(value.healthTips) &&
    value.healthTips.length >= 2 &&
    value.healthTips.every((item) => typeof item === 'string' && item.length >= 8)
  );
}

function isRawSymptomTrend(value: unknown): value is PeriodAiSymptomTrend {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Partial<PeriodAiSymptomTrend>;
  return (
    typeof item.title === 'string' &&
    item.title.length >= 2 &&
    typeof item.description === 'string' &&
    item.description.length >= 8 &&
    normalizeTrendKind(item.kind) === item.kind &&
    Number.isInteger(item.count)
  );
}

function isDateString(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
