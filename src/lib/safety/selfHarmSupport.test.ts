import { describe, expect, it } from 'vitest'
import {
  feedCardShowsSelfHarmSupport,
  postShowsSelfHarmSupport,
  searchSurfaceShowsSelfHarmSupport,
  selfHarmPostCountsAsStrike,
  SELF_HARM_TOPIC_TAG,
} from './selfHarmSupport.ts'

describe('selfHarmSupport', () => {
  it('shows the support message on the post page', () => {
    expect(
      postShowsSelfHarmSupport({
        isSelfHarmTopic: true,
        containsSelfHarmMethods: false,
      }),
    ).toBe(true)
  })

  it('recognizes self-harm topic via tag', () => {
    expect(
      postShowsSelfHarmSupport({
        isSelfHarmTopic: false,
        containsSelfHarmMethods: false,
        tags: [SELF_HARM_TOPIC_TAG],
      }),
    ).toBe(true)
  })

  it('does not show support in search results', () => {
    expect(searchSurfaceShowsSelfHarmSupport()).toBe(false)
    expect(feedCardShowsSelfHarmSupport()).toBe(false)
    expect(
      postShowsSelfHarmSupport({
        isSelfHarmTopic: true,
        containsSelfHarmMethods: false,
      }),
    ).toBe(true)
  })

  it('self-harm posts do not create a strike', () => {
    expect(
      selfHarmPostCountsAsStrike({
        isSelfHarmTopic: true,
        containsSelfHarmMethods: false,
      }),
    ).toBe(false)
    expect(
      selfHarmPostCountsAsStrike({
        isSelfHarmTopic: false,
        containsSelfHarmMethods: true,
      }),
    ).toBe(false)
    expect(
      selfHarmPostCountsAsStrike({
        isSelfHarmTopic: false,
        containsSelfHarmMethods: false,
      }),
    ).toBe(true)
  })
})
