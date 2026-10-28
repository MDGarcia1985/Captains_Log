/*
 * File: scripts/account-identity-yaml-smoke.ts
 *
 * Purpose:
 *     Parse the authoritative account-identity YAML and check it against repository schema evidence.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 *
 * Related Decisions:
 *     DEV-2026-09-20-002, DEV-2026-09-20-003, DEV-2026-09-21-001, DEV-2026-09-21-002, DEV-2026-09-21-003, DEV-2026-09-22-001, DEV-2026-09-28-001
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

import { DATABASE_VERSION } from '../src/adapters/sqlite/schema.ts';

const failures: string[] = [];
let assertions = 0;

function assert(name: string, condition: boolean): void {
  assertions += 1;
  if (!condition) {
    failures.push(name);
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const specPath = join(root, 'docs', 'ACCOUNT_IDENTITY.yaml');
const spec = parse(readFileSync(specPath, 'utf8')) as {
  document?: {
    status?: string;
    implementation_started?: boolean;
    p01_blocked_until_proposed_review?: boolean;
    architecture_review_hold?: string;
    decision_status_summary?: { proposed_for_review?: unknown[]; proposed_review_blocking_p01?: unknown[] };
  };
  schemas?: {
    database?: { version?: number; schema_3_is_not_this?: boolean };
    account_identity?: { version?: number };
    graph?: { version?: number };
    ui?: {
      manifest?: { version?: number };
      layout_generator?: { schema_version?: number };
      credentials_forbidden?: boolean;
    };
    backup_snapshot?: { version?: number };
    sync_protocol?: { version?: number };
    sharing_protocol?: { version?: number };
  };
  invariants?: { id?: string; rule?: string }[];
  decisions?: Record<string, { status?: string; title?: string }>;
  identity_layers?: { order?: string[] };
  factors?: { passkey?: { classification?: string; synced_passkey_is_not_device_enrollment?: boolean } };
  recovery_security_statement?: { soften_to_imply_administrative_recovery?: string | boolean };
  encryption?: {
    model?: string;
    aek?: {
      size_bits?: number;
      entropy_bits?: number;
      random_and_separate_from_recovery_secret?: boolean;
      directly_encrypts_general_content?: boolean;
    };
    recovery_secret?: {
      entropy_bits?: number;
      encoding?: { type?: string; characters?: number };
      generated_locally?: boolean;
      authority_receives_plaintext?: boolean;
      recoverable_by_captains_log?: boolean;
    };
    recovery_kek?: { hkdf?: { info?: string }; directly_encrypts_archive_content?: boolean };
    wrapping?: {
      user_local_lock?: { feed_directly_to_hkdf?: string; required?: boolean };
      device?: {
        first_launch?: { requires_captains_log_password_or_pin?: boolean };
        local_archive_unlock?: { webauthn_passkey?: boolean; remote_account_required?: boolean };
      };
    };
    domain_keys?: { keys?: { id?: string; info?: string }[] };
    sqlite?: { pragma_key_info?: string };
    aes_256_gcm?: { nonce?: { reuse_with_same_key?: string }; key_bits?: number };
    plaintext_migration?: { guaranteed_physical_erasure?: boolean; original_retained_until_verification?: boolean };
  };
  grants?: {
    format?: string;
    signing?: string;
    ttl_seconds?: { default?: number; max?: number; local_sharing?: number };
    private_authority_signing_keys_distributed_to_clients?: boolean;
  };
  sharing?: {
    object_encryption?: {
      double_or_triple_ratchet_as_storage_protocol?: string | boolean;
      archive_aek_is_never_the_recipient_sharing_key?: boolean;
      remaining_specification?: string[];
      wrap_target?: string;
    };
  };
  identifiers?: { user_id?: { distinct_from?: string; authentication?: boolean; authorization?: boolean } };
  authority?: {
    hosting?: string;
    docker?: { health_endpoints?: string[] };
    development_database?: { provider?: string; service?: string; region?: string; database?: string };
  };
  repository_boundary?: {
    public_product_repository?: { name?: string; visibility?: string };
    private_deployment_infrastructure_repository?: { name?: string; visibility?: string };
    github_aws_deployment_boundary?: { permanent_aws_access_keys_in_github_secrets?: string };
    local_developer_authentication?: { profile?: string; long_lived_aws_access_keys_in_dotenv?: string };
    aws_secrets_manager?: { resolution?: string; agent_get_secret_value?: string };
  };
  beta_gate?: {
    security_phase?: string;
    requires_archive_encryption?: string;
    requires_first_delivery_authentication?: Record<string, string>;
    requires_recovery?: string;
  };
  phases?: { id?: string; commit_breakpoint?: string; prerequisites?: string[]; blocked_until?: string }[];
  first_implementation_phase_after_this_document?: string;
  p01_blocked_until_proposed_review?: boolean;
  stop_and_surface?: string[];
};

const uiYaml = readFileSync(join(root, 'src', 'ui', 'ui.yaml'), 'utf8');
const mobileYaml = readFileSync(join(root, 'src', 'ui', 'yaml_layout', 'mobile', 'mobile.yaml'), 'utf8');
const migrations = readFileSync(join(root, 'src', 'adapters', 'sqlite', 'migrations.ts'), 'utf8');
const database = readFileSync(join(root, 'src', 'adapters', 'sqlite', 'database.ts'), 'utf8');
const awsExample = readFileSync(join(root, 'docs', 'aws.example.yaml'), 'utf8');

assert('yaml document status is authoritative', spec.document?.status === 'authoritative');
assert('implementation has not started', spec.document?.implementation_started === false);
assert('p01 architecture hold is released', spec.document?.p01_blocked_until_proposed_review === false);
assert('architecture review hold is released', spec.document?.architecture_review_hold === 'released');
assert('no proposed review blocking p01', (spec.document?.decision_status_summary?.proposed_review_blocking_p01?.length ?? 0) === 0);
assert('no proposed for review', (spec.document?.decision_status_summary?.proposed_for_review?.length ?? 0) === 0);
assert('account identity schema is 1', spec.schemas?.account_identity?.version === 1);
assert('sqlite schema in yaml is 2', spec.schemas?.database?.version === 2);
assert('sqlite DATABASE_VERSION is 2', DATABASE_VERSION === 2);
assert('yaml sqlite version matches code', spec.schemas?.database?.version === DATABASE_VERSION);
assert('schema 3 is not sqlite', spec.schemas?.database?.schema_3_is_not_this === true);
assert('no sqlite migrateV3', !migrations.includes('migrateV3') && !database.includes('user_version = 3'));
assert('graph schema is 1', spec.schemas?.graph?.version === 1);
assert('ui manifest is 1', spec.schemas?.ui?.manifest?.version === 1);
assert('ui.yaml version 1', /version:\s*1/.test(uiYaml));
assert('layout generator schema is 3', spec.schemas?.ui?.layout_generator?.schema_version === 3);
assert('mobile.yaml schema_version 3', /schema_version:\s*3/.test(mobileYaml));
assert('ui credentials forbidden', spec.schemas?.ui?.credentials_forbidden === true);
assert('backup snapshot is 1', spec.schemas?.backup_snapshot?.version === 1);
assert('sync protocol is 1', spec.schemas?.sync_protocol?.version === 1);
assert('sharing protocol is 1', spec.schemas?.sharing_protocol?.version === 1);

const approved = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'];
for (const id of approved) {
  assert(`${id} is APPROVED`, spec.decisions?.[id]?.status === 'APPROVED');
}
assert('D13 exists', Boolean(spec.decisions?.D13));
assert('D13 hosting is approved', spec.decisions?.D13?.status === 'APPROVED');
assert('D14 passkey classification is approved', spec.decisions?.D14?.status === 'APPROVED');
assert('D15 key hierarchy is approved', spec.decisions?.D15?.status === 'APPROVED');
assert('D16 cardinality is approved', spec.decisions?.D16?.status === 'APPROVED');
assert('D17 grant format is approved', spec.decisions?.D17?.status === 'APPROVED');
assert('D24 drive binding is approved', spec.decisions?.D24?.status === 'APPROVED');
assert('D28 plaintext migration is approved', spec.decisions?.D28?.status === 'APPROVED');
assert('D29 auth lifetime is approved', spec.decisions?.D29?.status === 'APPROVED');
assert('D30 optional local lock is approved', spec.decisions?.D30?.status === 'APPROVED');
assert('D31 device pop is approved', spec.decisions?.D31?.status === 'APPROVED');
assert('D32 local versus webauthn is approved', spec.decisions?.D32?.status === 'APPROVED');
assert('D33 aek recovery is approved', spec.decisions?.D33?.status === 'APPROVED');
assert('D34 shared object keys are approved', spec.decisions?.D34?.status === 'APPROVED');
assert('D34-A recipient key target is approved', spec.decisions?.['D34-A']?.status === 'APPROVED');
assert('D34-B revocation rekey is approved', spec.decisions?.['D34-B']?.status === 'APPROVED');
assert('D34-C historical versions is approved', spec.decisions?.['D34-C']?.status === 'APPROVED');
assert('D34-D new device dek access is approved', spec.decisions?.['D34-D']?.status === 'APPROVED');
assert('D35 session storage is approved direction', spec.decisions?.D35?.status === 'APPROVED_DIRECTION');
assert('D36 grant binding is approved', spec.decisions?.D36?.status === 'APPROVED');
assert('D37 email otp is approved', spec.decisions?.D37?.status === 'APPROVED');
assert('D38 human readable user id is approved', spec.decisions?.D38?.status === 'APPROVED');
assert('D38 is not sharing remaining spec', spec.decisions?.D38?.title !== 'Shared-object recipient-key hierarchy and rekey policy');
assert('D25 google license blocked on operator', spec.decisions?.D25?.status === 'BLOCKED_ON_OPERATOR');
const proposedDecisions = Object.entries(spec.decisions ?? {}).filter(
  ([, decision]) => decision.status === 'PROPOSED_REVIEW' || decision.status === 'PROPOSED_FOR_REVIEW'
);
assert('no remaining proposed decisions', proposedDecisions.length === 0);

assert('invariants present', (spec.invariants?.length ?? 0) >= 52);
assert(
  'no uuid authorization invariant',
  spec.invariants?.some((item) => item.rule === 'no_authorization_from_uuid_possession_alone') === true
);
assert(
  'no user_id authorization invariant',
  spec.invariants?.some((item) => item.rule === 'no_authorization_from_user_id_possession_alone') === true
);
assert(
  'local unlock is not account authentication',
  spec.invariants?.some((item) => item.rule === 'local_archive_unlock_is_not_account_authentication') === true
);
assert(
  'account passkey is not device enrollment',
  spec.invariants?.some((item) => item.rule === 'account_passkey_is_not_device_enrollment') === true
);
assert(
  'archive aek is never sharing key',
  spec.invariants?.some((item) => item.rule === 'archive_aek_is_never_the_recipient_sharing_key') === true
);
assert('user_id distinct from account_uuid', spec.identifiers?.user_id?.distinct_from === 'account_uuid');
assert('user_id is not authentication', spec.identifiers?.user_id?.authentication === false);
assert('user_id is not authorization', spec.identifiers?.user_id?.authorization === false);
assert(
  'local unlock is not webauthn',
  spec.encryption?.wrapping?.device?.local_archive_unlock?.webauthn_passkey === false
);
assert(
  'local unlock does not require remote account',
  spec.encryption?.wrapping?.device?.local_archive_unlock?.remote_account_required === false
);
assert(
  'session token not in sqlite',
  spec.invariants?.some((item) => item.rule === 'no_captains_log_session_token_in_sqlite') === true
);
assert(
  'no plaintext aek at authority',
  spec.invariants?.some((item) => item.rule === 'no_plaintext_aek_or_recovery_secret_at_authority') === true
);
assert(
  'account recovery does not imply archive decryption',
  spec.invariants?.some((item) => item.rule === 'account_recovery_does_not_imply_archive_decryption') === true
);
assert(
  'aes gcm nonce reuse forbidden',
  spec.invariants?.some((item) => item.rule === 'aes_gcm_nonce_reuse_is_forbidden') === true
);
assert(
  'raw aek not general content key',
  spec.invariants?.some((item) => item.rule === 'raw_aek_not_used_as_general_content_key') === true
);
assert(
  'sharing does not disclose aek',
  spec.invariants?.some((item) => item.rule === 'sharing_one_object_does_not_disclose_archive_aek') === true
);
assert('encryption model is layered hierarchy', spec.encryption?.model === 'layered_key_hierarchy');
assert('aek is 256 bits', spec.encryption?.aek?.entropy_bits === 256 || spec.encryption?.aek?.size_bits === 256);
assert(
  'aek separate from recovery secret',
  spec.encryption?.aek?.random_and_separate_from_recovery_secret === true
);
assert('raw aek does not encrypt general content', spec.encryption?.aek?.directly_encrypts_general_content === false);
assert('recovery secret is 256 bits', spec.encryption?.recovery_secret?.entropy_bits === 256);
assert('recovery secret encoding is hex', spec.encryption?.recovery_secret?.encoding?.type === 'hexadecimal');
assert('recovery secret is 64 characters', spec.encryption?.recovery_secret?.encoding?.characters === 64);
assert('recovery secret generated locally', spec.encryption?.recovery_secret?.generated_locally === true);
assert(
  'authority does not receive recovery secret',
  spec.encryption?.recovery_secret?.authority_receives_plaintext === false
);
assert(
  'captains log cannot recover secret',
  spec.encryption?.recovery_secret?.recoverable_by_captains_log === false
);
assert(
  'recovery kek hkdf info is domain separated',
  spec.encryption?.recovery_kek?.hkdf?.info === 'captains-log/recovery-kek/v1'
);
assert(
  'recovery kek does not encrypt archive content',
  spec.encryption?.recovery_kek?.directly_encrypts_archive_content === false
);
assert(
  'password is not fed to hkdf',
  spec.encryption?.wrapping?.user_local_lock?.feed_directly_to_hkdf === 'forbidden'
);
assert(
  'sqlite domain info documented',
  spec.encryption?.domain_keys?.keys?.some((key) => key.id === 'sqlite' && key.info === 'captains-log/sqlite/v1') ===
    true
);
assert(
  'file domain info documented',
  spec.encryption?.domain_keys?.keys?.some((key) => key.id === 'files' && key.info === 'captains-log/files/v1') === true
);
assert('sqlcipher key uses sqlite domain', spec.encryption?.sqlite?.pragma_key_info === 'captains-log/sqlite/v1');
assert('aes gcm key is 256 bits', spec.encryption?.aes_256_gcm?.key_bits === 256);
assert('aes gcm nonce reuse forbidden in spec', spec.encryption?.aes_256_gcm?.nonce?.reuse_with_same_key === 'forbidden');
assert(
  'plaintext original retained until verification',
  spec.encryption?.plaintext_migration?.original_retained_until_verification === true
);
assert(
  'physical erasure not guaranteed',
  spec.encryption?.plaintext_migration?.guaranteed_physical_erasure === false
);
assert(
  'no double or triple ratchet storage protocol',
  spec.invariants?.some((item) => item.rule === 'no_double_or_triple_ratchet_as_object_storage_protocol') === true
);
assert(
  'recovery warning must not be softened',
  spec.recovery_security_statement?.soften_to_imply_administrative_recovery === 'forbidden'
);
assert('grants are jws', spec.grants?.format === 'jws');
assert('grants signed with ed25519', spec.grants?.signing === 'ed25519_authority_keys');
assert('grant default ttl is 300s', spec.grants?.ttl_seconds?.default === 300);
assert('grant max ttl is 3600s', spec.grants?.ttl_seconds?.max === 3600);
assert('local sharing ttl is 120s', spec.grants?.ttl_seconds?.local_sharing === 120);
assert(
  'authority signing private keys stay off clients',
  spec.grants?.private_authority_signing_keys_distributed_to_clients === false
);
assert(
  'sharing forbids messaging ratchet',
  spec.sharing?.object_encryption?.double_or_triple_ratchet_as_storage_protocol === 'forbidden'
);
assert(
  'sharing remaining spec is empty',
  Array.isArray(spec.sharing?.object_encryption?.remaining_specification) &&
    spec.sharing.object_encryption.remaining_specification.length === 0 &&
    spec.sharing?.object_encryption?.archive_aek_is_never_the_recipient_sharing_key === true
);
assert(
  'object dek wrap target is account sharing public key',
  spec.sharing?.object_encryption?.wrap_target === 'recipient_account_sharing_public_key'
);
assert('authority hosts on ecs fargate', spec.authority?.hosting === 'amazon_ecs_fargate');
assert(
  'authority health endpoints exist',
  spec.authority?.docker?.health_endpoints?.includes('/health/live') === true &&
    spec.authority?.docker?.health_endpoints?.includes('/health/ready') === true &&
    spec.authority?.docker?.health_endpoints?.includes('/version') === true
);
assert('dev rds is us-east-2 captains_log', spec.authority?.development_database?.region === 'us-east-2' && spec.authority?.development_database?.database === 'captains_log');
assert('public repo is captains-log', spec.repository_boundary?.public_product_repository?.name === 'captains-log');
assert('private infra repo is captains-log-infra', spec.repository_boundary?.private_deployment_infrastructure_repository?.name === 'captains-log-infra');
assert(
  'github oidc forbids permanent aws keys',
  spec.repository_boundary?.github_aws_deployment_boundary?.permanent_aws_access_keys_in_github_secrets === 'forbidden'
);
assert('developer aws profile is default', spec.repository_boundary?.local_developer_authentication?.profile === 'default');
assert('secrets manager resolution is runtime', spec.repository_boundary?.aws_secrets_manager?.resolution === 'runtime');
assert(
  'agent get-secret-value is forbidden',
  spec.repository_boundary?.aws_secrets_manager?.agent_get_secret_value === 'forbidden'
);
assert('aws example uses placeholders', awsExample.includes('${RDS_SECRET_ARN}') && awsExample.includes('${ECS_CLUSTER}'));
assert('aws example uses default profile', /profile:\s*default/.test(awsExample));
assert('aws example resolves secrets at runtime', awsExample.includes('resolution: runtime'));
assert('aws example forbids agent get-secret-value', awsExample.includes('agent_get_secret_value: forbidden'));
assert('aws example has no live secretsmanager arn', !/arn:aws:secretsmanager:[a-z0-9-]+:\d{12}:/.test(awsExample));
assert(
  'first launch does not require password',
  spec.encryption?.wrapping?.device?.first_launch?.requires_captains_log_password_or_pin === false
);
assert('local lock is optional', spec.encryption?.wrapping?.user_local_lock?.required === false);
assert('beta requires archive encryption P04', spec.beta_gate?.requires_archive_encryption === 'P04');
assert(
  'identity layer order starts local',
  spec.identity_layers?.order?.[0] === 'local_profile' && spec.identity_layers?.order?.[2] === 'captains_log_account'
);
assert('passkey is a factor', spec.factors?.passkey?.classification === 'authentication_factor');
assert(
  'passkey sync is not device trust',
  spec.factors?.passkey?.synced_passkey_is_not_device_enrollment === true
);

const phaseIds = spec.phases?.map((phase) => phase.id) ?? [];
assert('P00 is first phase', phaseIds[0] === 'P00');
assert('P01 follows documentation', spec.first_implementation_phase_after_this_document === 'P01');
assert('P01 exists', phaseIds.includes('P01'));
assert('root p01 hold is released', spec.p01_blocked_until_proposed_review === false);
assert('P08 google native exists', phaseIds.includes('P08'));
assert('beta security phase is P29', spec.beta_gate?.security_phase === 'P29');
assert('beta requires google P08', spec.beta_gate?.requires_first_delivery_authentication?.google === 'P08');
assert('beta requires passkey P10', spec.beta_gate?.requires_first_delivery_authentication?.passkey === 'P10');
assert('beta requires totp P12', spec.beta_gate?.requires_first_delivery_authentication?.totp === 'P12');
assert('beta requires email P13', spec.beta_gate?.requires_first_delivery_authentication?.verified_email === 'P13');
assert('beta requires recovery P14', spec.beta_gate?.requires_recovery === 'P14');
const p29 = spec.phases?.find((phase) => phase.id === 'P29');
const p29prereqs = p29?.prerequisites ?? [];
for (const required of ['P04', 'P08', 'P10', 'P12', 'P13', 'P14']) {
  assert(`P29 requires ${required}`, p29prereqs.includes(required));
}
assert('every phase has commit breakpoint', spec.phases?.every((phase) => Boolean(phase.commit_breakpoint)) === true);
assert('P08 remains blocked on D25', spec.phases?.find((phase) => phase.id === 'P08')?.blocked_until === 'D25_license_or_reviewed_alternative');
assert('P10 remains blocked on rp id', spec.phases?.find((phase) => phase.id === 'P10')?.blocked_until === 'permanent_cl_controlled_https_rp_id');
assert('P19 is not architecture-blocked', spec.phases?.find((phase) => phase.id === 'P19')?.blocked_until == null);
assert('P20 is not architecture-blocked', spec.phases?.find((phase) => phase.id === 'P20')?.blocked_until == null);
assert('P24 is not architecture-blocked', spec.phases?.find((phase) => phase.id === 'P24')?.blocked_until == null);
assert('stop conditions exist', (spec.stop_and_surface?.length ?? 0) >= 6);

if (failures.length > 0) {
  console.error('FAIL account-identity-yaml-smoke');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('PASS account-identity-yaml-smoke');
console.log(`assertions=${assertions}`);
