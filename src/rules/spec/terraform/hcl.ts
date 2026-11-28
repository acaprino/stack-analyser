// Loaded on the first Terraform file: the module decompresses a WebAssembly parser, which a project without Terraform never needs.
export const loadHcl = (): Promise<typeof import('@cdktf/hcl2json')> => import('@cdktf/hcl2json');
