import * as v from 'valibot';
import { PROPERTIES } from './constants';

export const DeclarationKindSchema = v.picklist([
  'function',
  'class',
  'interface',
  'type',
  'variable',
  'const',
  'let',
  'enum',
]);

export const ImportInfoSchema = v.object({
  moduleSpecifier: v.string(),
  kind: v.picklist(['default', 'named', 'namespace', 'side-effect']),
  namedImports: v.optional(v.array(v.string())),
  default: v.optional(v.string()),
  isDynamic: v.optional(v.boolean()),
  isTypeOnly: v.optional(v.boolean()),
});

export const ExportInfoSchema = v.object({
  name: v.string(),
  kind: v.picklist(['default', 'named', 'namespace']),
  text: v.optional(v.string()),
  moduleSpecifier: v.optional(v.string()),
  declarationKind: v.optional(DeclarationKindSchema),
});

export const FileAnalysisSchema = v.object({
  relativePath: v.string(),
  imports: v.array(ImportInfoSchema),
  exports: v.optional(v.array(ExportInfoSchema)),
  text: v.string(),
});

// Schema pour CodebaseAnalysis
export const CodebaseAnalysisSchema = v.record(
  v.string(),
  FileAnalysisSchema,
);

// Schema pour les statistiques d'analyse
export const AnalysisStatsSchema = v.object({
  files: v.number(),
  imports: v.number(),
  exports: v.number(),
});

// Schema complet pour un fichier .code contenant l'analyse complète
export const CodeAnalysisFileSchema = v.object({
  [PROPERTIES.CODEBASE_ANALYSIS]: CodebaseAnalysisSchema,
  [PROPERTIES.STATS]: v.optional(AnalysisStatsSchema),
});

// Types inférés des schémas
export type DeclarationKind = v.InferOutput<typeof DeclarationKindSchema>;
export type ImportInfo = v.InferOutput<typeof ImportInfoSchema>;
export type ExportInfo = v.InferOutput<typeof ExportInfoSchema>;
export type FileAnalysis = v.InferOutput<typeof FileAnalysisSchema>;
export type CodebaseAnalysis = v.InferOutput<
  typeof CodebaseAnalysisSchema
>;
export type AnalysisStats = v.InferOutput<typeof AnalysisStatsSchema>;
export type CodeAnalysisFile = v.InferOutput<
  typeof CodeAnalysisFileSchema
>;
