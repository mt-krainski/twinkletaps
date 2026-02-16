import { prisma } from "../prisma";

export class MqttCredentialPoolEmptyError extends Error {
  readonly name = "MqttCredentialPoolEmptyError";
}

export type ClaimedMqttCredential = {
  username: string;
  password: string;
  allocatedUuid: string;
};

type CredentialRow = {
  id: string;
  username: string;
  password: string;
  allocated_uuid: string;
};

export async function claimMqttCredential(): Promise<ClaimedMqttCredential> {
  const result = await prisma.$transaction(async (tx) => {
    // Raw SQL for FOR UPDATE SKIP LOCKED: locks the selected row so concurrent
    // callers each get a different credential; Prisma ORM doesn't expose this.
    const rows = await tx.$queryRaw<CredentialRow[]>`
      SELECT id, username, password, allocated_uuid
      FROM mqtt_credentials
      WHERE claimed_at IS NULL
      ORDER BY id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    if (rows.length === 0) {
      throw new MqttCredentialPoolEmptyError(
        "No unclaimed MQTT credentials in pool",
      );
    }
    const row = rows[0];
    await tx.$executeRaw`
      UPDATE mqtt_credentials SET claimed_at = now() WHERE id = ${row.id}
    `;
    return {
      username: row.username,
      password: row.password,
      allocatedUuid: row.allocated_uuid,
    };
  });
  return result;
}
