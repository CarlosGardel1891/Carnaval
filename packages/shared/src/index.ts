import type { Tables } from './database.types'

export * from './dates'
export * from './norm'
export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.types'

export type Temporada = Tables<'temporadas'>
