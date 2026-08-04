import assert from "node:assert/strict";
import test from "node:test";
import { createInvitationToken, hashInvitationToken, invitationState, publicInvitationError } from "../lib/invitations.ts";

test("employee invitation token is unguessable and hashes deterministically", () => {
  const one=createInvitationToken();const two=createInvitationToken();
  assert.ok(one.length>=43);assert.notEqual(one,two);
  assert.match(hashInvitationToken(one),/^[0-9a-f]{64}$/);assert.equal(hashInvitationToken(one),hashInvitationToken(one));
});

test("invitation failures remain specific", () => {
  const future=new Date(Date.now()+60_000).toISOString();const past=new Date(Date.now()-60_000).toISOString();
  assert.equal(invitationState({status:"pending",expires_at:future,used_at:null}),null);
  assert.equal(invitationState({status:"pending",expires_at:past,used_at:null}),"INVITATION_EXPIRED");
  assert.equal(invitationState({status:"accepted",expires_at:future,used_at:new Date().toISOString()}),"INVITATION_USED");
  assert.equal(invitationState({status:"revoked",expires_at:future,used_at:null}),"INVITATION_REVOKED");
  assert.match(publicInvitationError("ACCOUNT_EXISTS"),/已注册/);
});
