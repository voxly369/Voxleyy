import { COVER_FONT_CATALOG } from './catalog.ts'

export type FontLicenceNotice = {
  fontId: string
  name: string
  copyright: string
  licence: string
}

const SIL_OFL =
  'Licensed under the SIL Open Font License, Version 1.1. This Font Software is distributed on an “AS IS” basis, without warranties or conditions of any kind, either express or implied.'

const NOTICES: Record<string, Omit<FontLicenceNotice, 'fontId'>> = {
  fraunces: {
    name: 'Fraunces',
    copyright: 'Copyright 2018–2021 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces)',
    licence: SIL_OFL,
  },
  lora: {
    name: 'Lora',
    copyright: 'Copyright 2011 The Lora Project Authors (https://github.com/cyrealtype/Lora)',
    licence: SIL_OFL,
  },
  inter: {
    name: 'Inter',
    copyright: 'Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)',
    licence: SIL_OFL,
  },
  'libre-baskerville': {
    name: 'Libre Baskerville',
    copyright: 'Copyright 2012 The Libre Baskerville Authors (https://github.com/impallari/Libre-Baskerville)',
    licence: SIL_OFL,
  },
  merriweather: {
    name: 'Merriweather',
    copyright: 'Copyright 2010–2021 The Merriweather Project Authors (https://github.com/SorkinType/Merriweather)',
    licence: SIL_OFL,
  },
  cormorant: {
    name: 'Cormorant Garamond',
    copyright: 'Copyright 2015 The Cormorant Project Authors (https://github.com/CatharsisFonts/Cormorant)',
    licence: SIL_OFL,
  },
  playfair: {
    name: 'Playfair Display',
    copyright: 'Copyright 2010–2022 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display)',
    licence: SIL_OFL,
  },
  montserrat: {
    name: 'Montserrat',
    copyright: 'Copyright 2011 The Montserrat Project Authors (https://github.com/JulietaUla/Montserrat)',
    licence: SIL_OFL,
  },
  raleway: {
    name: 'Raleway',
    copyright: 'Copyright 2010 The Raleway Project Authors (https://github.com/theleagueof/raleway)',
    licence: SIL_OFL,
  },
  'josefin-sans': {
    name: 'Josefin Sans',
    copyright: 'Copyright 2010 Santiago Orozco (https://github.com/googlefonts/josefin-sans)',
    licence: SIL_OFL,
  },
  'work-sans': {
    name: 'Work Sans',
    copyright: 'Copyright 2014 The Work Sans Project Authors (https://github.com/weiweihuanghuang/Work-Sans)',
    licence: SIL_OFL,
  },
  cinzel: {
    name: 'Cinzel',
    copyright: 'Copyright 2012 Natanael Gama (https://github.com/natanaelgama/cinzel)',
    licence: SIL_OFL,
  },
  oswald: {
    name: 'Oswald',
    copyright: 'Copyright 2016 The Oswald Project Authors (https://github.com/googlefonts/OswaldFont)',
    licence: SIL_OFL,
  },
  'bebas-neue': {
    name: 'Bebas Neue',
    copyright: 'Copyright 2010 Dharma Type (https://github.com/dharmatype/Bebas-Neue)',
    licence: SIL_OFL,
  },
  'dancing-script': {
    name: 'Dancing Script',
    copyright: 'Copyright 2016 The Dancing Script Project Authors (https://github.com/googlefonts/dancing-script)',
    licence: SIL_OFL,
  },
  'great-vibes': {
    name: 'Great Vibes',
    copyright: 'Copyright 2010 TypeSETit, LLC (https://github.com/googlefonts/great-vibes)',
    licence: SIL_OFL,
  },
  pacifico: {
    name: 'Pacifico',
    copyright: 'Copyright 2018 The Pacifico Project Authors (https://github.com/googlefonts/pacifico)',
    licence: SIL_OFL,
  },
  caveat: {
    name: 'Caveat',
    copyright: 'Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat)',
    licence: SIL_OFL,
  },
  opendyslexic: {
    name: 'OpenDyslexic',
    copyright:
      'Copyright (c) 2012 by Abelardo Gonzalez. Based on Bitstream Vera Sans Copyright (c) 2003 by Bitstream, Inc.',
    licence:
      'OpenDyslexic is available under the Bitstream Vera License and Creative Commons Attribution 3.0 Unported (CC BY 3.0).',
  },
}

export function coverFontLicenceNotices(): FontLicenceNotice[] {
  return COVER_FONT_CATALOG.map((font) => {
    const notice = NOTICES[font.id]
    if (!notice) {
      return {
        fontId: font.id,
        name: font.label,
        copyright: 'Copyright holders not recorded.',
        licence: SIL_OFL,
      }
    }
    return { fontId: font.id, ...notice }
  })
}

export function coverFontLicenceForId(fontId: string): FontLicenceNotice | null {
  const notice = NOTICES[fontId]
  if (!notice) return null
  return { fontId, ...notice }
}
