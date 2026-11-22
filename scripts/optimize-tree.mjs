// Poly Haven ағаш моделін сайтқа сығу: geometry simplify + meshopt + WebP текстуралар
// Қолдану: node scripts/optimize-tree.mjs <input.gltf> <output.glb> [ratio]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, simplify, textureCompress, meshopt } from '@gltf-transform/functions'
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

const [, , input, output, ratioArg] = process.argv
const ratio = Number(ratioArg || 0.3)
await MeshoptSimplifier.ready
await MeshoptEncoder.ready

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(input)
const count = () => doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).map((p) => (p.getIndices()?.getCount() || 0) / 3)
console.log('triangles before:', count().map(Math.round))

await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.004 }),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
)
console.log('triangles after:', count().map(Math.round))
await io.write(output, doc)
console.log('written', output)
