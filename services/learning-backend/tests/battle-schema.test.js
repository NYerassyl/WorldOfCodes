import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const schema = read('../prisma/schema.prisma');
const init = read('../prisma/migrations/20261103000000_init/migration.sql');
const additive = read('../prisma/migrations/20261103170000_add_battle_models/migration.sql');
const model = name => {
  const match = schema.match(new RegExp('^model ' + name + ' \\{([\\s\\S]*?)^\\}', 'm'));
  assert.ok(match, 'Prisma model missing: ' + name);
  return match[1];
};

test('all prior learning and account models remain present', () => {
  for (const name of [
    'User','AuthSession','Course','Topic','Lesson','Problem','TestCase',
    'Submission','ProblemCompletion','LessonProgress','CopyExercise',
    'CopyAttempt','CopyCompletion','RewardLedger'
  ]) assert.ok(model(name).length > 0);
  assert.match(schema, /provider\s*=\s*"postgresql"/);
});

test('Match uses existing Problem and User with inverse relations', () => {
  const m = model('Match');
  assert.match(m, /problemId\s+String/);
  assert.match(m, /winnerId\s+String\?/);
  assert.match(m, /type\s+MatchType/);
  assert.match(m, /status\s+MatchStatus\s+@default\(PENDING\)/);
  assert.match(m, /problem\s+Problem\s+@relation\(fields: \[problemId\], references: \[id\]/);
  assert.match(m, /winner\s+User\?\s+@relation\("MatchWinner", fields: \[winnerId\]/);
  assert.match(model('Problem'), /matches\s+Match\[\]/);
  assert.match(model('User'), /wonMatches\s+Match\[\]\s+@relation\("MatchWinner"\)/);
  assert.match(model('User'), /matchPlayers\s+MatchPlayer\[\]/);
});

test('MatchPlayer has composite PK, unique seat, and nullable result', () => {
  const m = model('MatchPlayer');
  assert.match(m, /@@id\(\[matchId, userId\]\)/);
  assert.match(m, /@@unique\(\[matchId, seat\]\)/);
  assert.match(m, /verdict\s+SubmissionStatus\?/);
  assert.match(m, /submittedAt\s+DateTime\?/);
  assert.match(m, /ratingBefore\s+Int\?/);
  assert.match(m, /ratingDelta\s+Int\?/);
  assert.match(additive, /PRIMARY KEY \("matchId", "userId"\)/);
  assert.match(additive, /CREATE UNIQUE INDEX "MatchPlayer_matchId_seat_key"/);
});

test('Rating is separate from learning XP and starts at 1000', () => {
  const m = model('Rating');
  assert.match(m, /userId\s+String\s+@id/);
  assert.match(m, /points\s+Int\s+@default\(1000\)/);
  for (const field of ['wins','losses','draws']) assert.match(m, new RegExp(field + '\\s+Int\\s+@default\\(0\\)'));
  assert.match(m, /updatedAt\s+DateTime\s+@updatedAt/);
  assert.match(model('User'), /rating\s+Rating\?/);
  assert.match(additive, /"points" INTEGER NOT NULL DEFAULT 1000/);
});

test('FriendBattle is one-to-one with Match and has unique inviteCode', () => {
  const m = model('FriendBattle');
  assert.match(m, /matchId\s+String\s+@unique/);
  assert.match(m, /inviteCode\s+String\s+@unique/);
  assert.match(m, /createdById\s+String/);
  assert.match(m, /expiresAt\s+DateTime/);
  assert.match(m, /createdAt\s+DateTime\s+@default\(now\(\)\)/);
  assert.match(model('User'), /createdFriendBattles\s+FriendBattle\[\]/);
  assert.match(model('Match'), /friendBattle\s+FriendBattle\?/);
  assert.match(additive, /CREATE UNIQUE INDEX "FriendBattle_matchId_key"/);
  assert.match(additive, /CREATE UNIQUE INDEX "FriendBattle_inviteCode_key"/);
});

test('additive migration has four tables, two enums and seven foreign keys', () => {
  assert.equal((additive.match(/CREATE TABLE /g)||[]).length, 4);
  assert.equal((additive.match(/CREATE TYPE /g)||[]).length, 2);
  assert.equal((additive.match(/FOREIGN KEY /g)||[]).length, 7);
  assert.equal((additive.match(/CREATE UNIQUE INDEX /g)||[]).length, 3);
  for (const name of ['Match','MatchPlayer','Rating','FriendBattle']) {
    assert.match(additive, new RegExp('CREATE TABLE "'+name+'"'));
  }
  assert.match(additive, /REFERENCES "Problem"\("id"\)/);
  assert.match(additive, /REFERENCES "User"\("id"\)/);
  assert.match(additive, /"verdict" "SubmissionStatus"/);
  assert.doesNotMatch(additive, /DROP TABLE|ALTER TABLE "User" ADD COLUMN|ALTER TABLE "Problem" ADD COLUMN/);
});

test('original migration stays learning-only; battle schema is a later migration', () => {
  for (const name of ['Match','MatchPlayer','Rating','FriendBattle']) {
    assert.doesNotMatch(init, new RegExp('CREATE TABLE "'+name+'"'));
  }
  assert.match(init, /CREATE TABLE "User"/);
  assert.match(init, /CREATE TABLE "Problem"/);
});

test('enum names match the proposed migration', () => {
  assert.match(schema, /enum MatchType \{\s+RANKED\s+FRIENDLY\s+\}/);
  assert.match(schema, /enum MatchStatus \{\s+PENDING\s+ACTIVE\s+COMPLETED\s+CANCELLED\s+EXPIRED\s+\}/);
  assert.match(additive, /CREATE TYPE "MatchType" AS ENUM \('RANKED', 'FRIENDLY'\)/);
  assert.match(additive, /CREATE TYPE "MatchStatus" AS ENUM \('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'\)/);
});

test('GPT 3 status/type index added without changing the original Battle index', () => {
  const followUp = read('../prisma/migrations/20261103220000_match_status_type_index/migration.sql');
  assert.match(model('Match'), /@@index\(\[type, status\]\)/);
  assert.match(model('Match'), /@@index\(\[status, type\]\)/);
  assert.match(additive, /CREATE INDEX "Match_type_status_idx" ON "Match"\("type", "status"\)/);
  assert.match(followUp, /CREATE INDEX "Match_status_type_idx" ON "Match"\("status", "type"\)/);
  assert.doesNotMatch(followUp, /ALTER TABLE|DROP TABLE|DROP INDEX/);
});

test('approved battle lifecycle and rating rules are documented for GPT 3', () => {
  const contract = read('../../../docs/contracts.md');
  assert.match(contract, /RANKED matches are created with `status: ACTIVE`/);
  assert.match(contract, /friendly invitations are created with `status: PENDING`/);
  assert.match(contract, /second participant joins/);
  assert.match(contract, /K = 32/);
  assert.match(contract, /30-minute expiry/);
  assert.match(contract, /one transaction/);
});
