import type * as Hcl from '@cdktf/hcl2json';

// Loaded on the first Terraform file: the module decompresses a WebAssembly parser, which a project without Terraform never needs.
export const loadHcl = (): Promise<typeof Hcl> => import('@cdktf/hcl2json');
