export interface ReproRuntimeDescriptor {
  application: "docs" | "api";
  runtime: string;
  generation: "nuxt3-h3v1" | "nitro3-h3v2";
}

export function createRuntimeDescriptor(
  application: ReproRuntimeDescriptor["application"],
  runtime: string,
  generation: ReproRuntimeDescriptor["generation"],
): ReproRuntimeDescriptor {
  return { application, runtime, generation };
}

export function formatRuntimeDescriptor(descriptor: ReproRuntimeDescriptor): string {
  return `${descriptor.application}:${descriptor.runtime}:${descriptor.generation}`;
}

export function createHealthPayload(service: string) {
  return {
    ok: true,
    service,
    timestamp: new Date().toISOString(),
  } as const;
}
