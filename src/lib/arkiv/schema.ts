import { addr, bytes32, i32, key, str, u64, u256 } from "@arkiv-network/sdk/attr";
import type { Address, Hex } from "viem";
import {
  PROJECT,
  SCHEMA_VERSION,
  type EntityType,
  type EvidenceKind,
  type Outcome,
} from "./config";

/** Attribute inputs for each entity type. All names lowercase — Tiramisu
 *  rejects uppercase at write time. Money is whole INR as u256; app
 *  timestamps are u64 milliseconds (on-chain createdAt is a block). */

export function commonAttrs(entityType: EntityType) {
  return {
    project: str(PROJECT),
    entity_type: str(entityType),
    schema_version: i32(SCHEMA_VERSION),
    created_at: u64(BigInt(Date.now())),
  };
}

export function termsAttrs(input: {
  tenant: Address;
  depositInr: bigint;
  city: string;
  propertyLabel: string;
  termsId: string;
}) {
  return {
    ...commonAttrs("deposit_terms"),
    city: str(input.city.toLowerCase()),
    tenant_wallet: addr(input.tenant),
    deposit_inr: u256(input.depositInr),
    property_label: str(input.propertyLabel),
    terms_id: str(input.termsId),
  };
}

export function outcomeAttrs(input: {
  landlord: Address;
  termsKey: Hex;
  outcome: Outcome;
  amountReturnedInr: bigint;
  city: string;
  outcomeId: string;
}) {
  return {
    ...commonAttrs("deposit_outcome"),
    city: str(input.city.toLowerCase()),
    landlord_wallet: addr(input.landlord),
    terms_key: key(input.termsKey),
    outcome: str(input.outcome),
    amount_returned_inr: u256(input.amountReturnedInr),
    outcome_id: str(input.outcomeId),
  };
}

export function evidenceAttrs(input: {
  outcomeKey: Hex;
  landlord: Address;
  sha256: Hex;
  kind: EvidenceKind;
}) {
  return {
    ...commonAttrs("evidence_log"),
    outcome_key: key(input.outcomeKey),
    landlord_wallet: addr(input.landlord),
    evidence_sha256: bytes32(input.sha256),
    evidence_kind: str(input.kind),
  };
}

/** Typed value helpers for reading attributes back (values deserialize as
 *  {type, value} objects; numerics are bigint). */

type AttrValue = { type: string; value: unknown };
export type Attrs = Record<string, AttrValue>;

export function attrStr(a: Attrs, name: string): string | undefined {
  const v = a[name];
  return v && v.type === "str" ? (v.value as string) : undefined;
}
export function attrBig(a: Attrs, name: string): bigint | undefined {
  const v = a[name];
  if (!v) return undefined;
  if (typeof v.value === "bigint") return v.value;
  if (typeof v.value === "number") return BigInt(v.value);
  return undefined;
}
export function attrAddr(a: Attrs, name: string): Address | undefined {
  const v = a[name];
  return v && v.type === "addr" ? (v.value as Address) : undefined;
}
export function attrKey(a: Attrs, name: string): Hex | undefined {
  const v = a[name];
  return v && (v.type === "key" || v.type === "bytes32")
    ? (v.value as Hex)
    : undefined;
}

/** DTOs — everything crossing a serialization boundary uses strings for
 *  bigint fields (attribute numerics deserialize as bigint; JSON.stringify
 *  throws without this). */

export type OutcomeDto = {
  entityKey: string;
  creator: string;
  landlord: string;
  termsKey: string | null;
  outcome: Outcome;
  amountReturnedInr: string;
  city: string;
  createdAtMs: string;
  expiresAtBlock: string;
  comment: string;
  depositInr: string;
  verified: boolean; // terms.tenant_wallet === outcome.$creator
  termsMissing: boolean;
};

export type TermsDto = {
  entityKey: string;
  creator: string;
  tenant: string;
  depositInr: string;
  city: string;
  propertyLabel: string;
  createdAtMs: string;
  expiresAtBlock: string;
  displayLabel: string;
};

export type EvidenceDto = {
  entityKey: string;
  outcomeKey: string;
  sha256: string;
  kind: EvidenceKind;
  filenameHint: string;
};

export type LandlordHistory = {
  landlord: string;
  outcomes: OutcomeDto[];
  terms: TermsDto[];
  totals: {
    promisedInr: string;
    returnedInr: string;
    count: number;
    full: number;
    partial: number;
    withheld: number;
    verified: number;
  };
  snapshotBlock: string;
};
