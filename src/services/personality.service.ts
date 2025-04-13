import { BASE_URL, routes } from "@/config"
import {
  Gender,
  GetTestResultsPayload,
  Question,
  QuestionOption,
  SessionData,
  Submission,
  TestResult,
  TraitsResponse,
} from "@/types"
import { replaceMap } from "@/utils/replaceMap"
import session from "@/utils/session"
import { HttpError } from "@/utils/httpError"

/**
 * @deprecated
 */
const startSession = async (ip: string) => {
  await session.get(BASE_URL)
  const res = await session.get(routes["api.session"])

  if (!res.config.jar) {
    throw new HttpError(500, "No cookies found")
  }

  return res.data
}

const getSession = async (): Promise<SessionData> => {
  const res = await session.get(routes["api.session"])
  

  return res.data
}

const getTraits = async (): Promise<TraitsResponse> => {
  const res = await session.post(routes["api.profile.traits"], {})

  return res.data
}

const getPersonalityTest = async (): Promise<Array<Question>> => {
  const res = await session.get(`${BASE_URL}/br/teste-de-personalidade`)
  const regex = new RegExp(/:questions="(\[.*?\])"/, "gm")
  const matches = regex.exec(res.data)

  if (!matches) throw new Error("No matches found")

  // console.log(matches[2])
  const unparsedQuestions = matches[1]

  const replacedQuestions = Object.entries(replaceMap).reduce(
    (acc, [key, value]) => acc.replaceAll(key, value),
    unparsedQuestions
  )
  const questions = JSON.parse(replacedQuestions)

  const defaultOptions: QuestionOption[] = [
    { text: "Discordo fortemente", value: -3 },
    { text: "Discordo moderadamente", value: -2 },
    { text: "Desconcordo", value: -1 },
    { text: "Não tenho certeza", value: 0 },
    { text: "Concordo", value: 1 },
    { text: "Concordo moderadamente", value: 2 },
    { text: "Concordo fortemente", value: 3 },
  ]

  return questions.map((question: any) => ({
    id: Buffer.from(question.text).toString("base64url"),
    text: question.text,
    options: defaultOptions,
  }))
}

const getTestResults = async (
  submissionData: Submission[],
  gender: Gender
): Promise<TestResult> => {
  const questions: Array<
    Omit<Submission, "id" | "value"> & { text: string; answer: number }
  > = submissionData.map((s) => ({
    text: Buffer.from(s.id, "base64url").toString(),
    answer: s.value,
  }))

  const payload = {
    extraData: [],
    gender,
    questions,
    teamInviteKey: "",
    inviteCode: "",
  }
    
  const res = await session.post<GetTestResultsPayload>(
    routes["test-results"],
    payload
  )
  
  // await session.post(res.data.redirect, payload)
  

  const sess = await getSession()
  
  const traitsData = await getTraits()
  
  return {
    ogLink : res.data.redirect,
    avatarAlt: sess.user.avatarAlt,
    avatarSrc: sess.user.avatar,
    avatarSrcStatic: sess.user.avatarFull,
    personality: sess.user.personality,
    variant: sess.user.variant,
    niceName: sess.user.role,
    profileUrl: sess.user.avatar,
    traits: traitsData.traits,
    role: sess.user.role,
    strategy: sess.user.strategy,
  }
}

export default {
  startSession,
  getPersonalityTest,
  getTestResults,
  getSession,
}
