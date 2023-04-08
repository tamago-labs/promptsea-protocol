import { Bytes, Key, Nat, Option, Tez, Or, pair_to_mich, Signature, string_to_mich, Rational } from '@completium/archetype-ts-types'
import { blake2b, expect_to_fail, get_account, set_mockup, set_mockup_now, set_quiet } from '@completium/experiment-ts'

import { item, balance_of_request, transfer_param, transfer_destination } from './binding/item';

const assert = require('assert');

const alice = get_account('alice');
const bob = get_account('bob');
const carl = get_account('carl');
const user1 = get_account('bootstrap1');
const user2 = get_account('bootstrap2');

set_mockup()

set_quiet(true);

const now = new Date("2022-01-01")
set_mockup_now(now)

const mock_url = new Bytes("697066733a2f2f516d617635756142437a4d77377871446f55364d444534743473695855484e4737664a68474c746f79774b35694a")
const intial_amount = new Nat(1)
const max_supply = new Nat(10)
const price = new Tez(1)

/* Scenarios --------------------------------------------------------------- */

describe('[Item NFT] Contracts deployment', async () => {
    it('Item contract deployment shoud succeed', async () => {
        await item.deploy(alice.get_address(), { as: alice })
    })
})

describe('[Item NFT] Authorize new token', async () => {
    it('Alice creates an NFT should succeed', async () => {

        await item.authorise([["", new Bytes("")]], intial_amount, price, max_supply, { as: alice })

        const current_count = await item.current_token_id({ as: alice })
        assert(`${current_count}` === "1")
        const token_owner = await item.token_owner(new Nat(1), { as: alice })
        assert(token_owner.toString() === Option.Some(alice.get_address()).toString())

        // check uri
        const uri = await item.uri(new Nat(1), { as: alice })
        assert(uri[0][1].equals(new Bytes("")))

        // check price
        const token_price = await item.get_token_price(new Nat(1), { as: alice })
        assert(token_price.equals(price))

        // check supply 
        const my_max_supply = await item.get_max_supply(new Nat(1), { as: alice })
        const my_current_supply = await item.get_current_supply(new Nat(1), { as: alice })
        assert(my_max_supply.equals(max_supply))
        assert(my_current_supply.equals(intial_amount))

        // check balance
        const my_balance = await item.balance_of([new balance_of_request(alice.get_address(), new Nat(1))], { as: alice })
        assert(my_balance[0].balance_.equals(new Nat(1)))

    })

    it('Alice updates params should succeed', async () => {

        // update uri
        await expect_to_fail(async () => {
            await item.set_token_uri(
                new Nat(1),
                [["", mock_url]],
                {
                    as: bob,
                }
            );
        }, item.errors.fa2_r5)
        
        await item.set_token_uri( new Nat(1), [["", mock_url]] , { as : alice })
        const uri = await item.uri(new Nat(1), { as: alice })
        assert(uri[0][1].equals( mock_url ))

        // update price
        await expect_to_fail(async () => {
            await item.set_token_price(
                new Nat(1),
                new Tez(2),
                {
                    as: bob,
                }
            );
        }, item.errors.fa2_r7)
        await item.set_token_price(new Nat(1), new Tez(2), { as: alice });

        const token_price = await item.get_token_price(new Nat(1), { as: alice })
        assert(token_price.equals(new Tez(2)))

        // update fee
        let current_fee = await item.get_token_fee( new Nat(1) , {as : alice})
        assert( current_fee.to_number() === 0.1 )

        await item.set_token_fee( new Nat(1), new Rational(0.15) , {as : alice })

        current_fee = await item.get_token_fee( new Nat(1) , {as : alice})
        assert( current_fee.to_number() === 0.15)
    })

    it('Bob mints an NFT should succeed', async () => {

        // mint
        await item.mint( bob.get_address(), new Nat(1) , new Nat(1) , { as : bob, amount : new Tez(2)})
        const my_balance = await item.balance_of([new balance_of_request(bob.get_address(), new Nat(1))], { as: bob })
        assert(my_balance[0].balance_.equals(new Nat(1)))

        // check current supply
        const my_current_supply = await item.get_current_supply(new Nat(1), { as: bob })
        assert(my_current_supply.equals( new Nat(2)))
    })

    it('Bob transfers an NFT to Carl should succeed', async () => {
        const a_token_id = new Nat(1)

        const bob_balance_before = await item.balance_of([new balance_of_request(bob.get_address(), new Nat(1))], { as: bob })
        assert(bob_balance_before[0].balance_.equals(new Nat(1)))
        const carl_balance_before = await item.balance_of([new balance_of_request(carl.get_address(), new Nat(1))], { as: carl })
        assert(carl_balance_before[0].balance_.equals(new Nat(0)))

        const tps = [new transfer_param(bob.get_address(), [new transfer_destination(carl.get_address(), a_token_id, new Nat(1))])]

        await item.transfer(tps, { as: bob })

        const bob_balance_after = await item.balance_of([new balance_of_request(bob.get_address(), new Nat(1))], { as: bob })
        assert(bob_balance_after[0].balance_.equals(new Nat(0)))
        const carl_balance_after = await item.balance_of([new balance_of_request(carl.get_address(), new Nat(1))], { as: carl })
        assert(carl_balance_after[0].balance_.equals(new Nat(1)))
    })

    it('Charlie burns an NFT should succeed', async () => {

        await item.burn( new Nat(1), new Nat(1) , { as : carl })

        const carl_balance = await item.balance_of([new balance_of_request(carl.get_address(), new Nat(1))], { as: carl })
        assert(carl_balance[0].balance_.equals(new Nat(0)))

        const total = await item.get_total_burnt(new Nat(1), { as: carl })
        assert(total.equals( new Nat(1)))

    })

    it('Alice transfers ownership to Bob should succeed', async () => {

        // transfer token owner
        await expect_to_fail(async () => {
            await item.transfer_token_owner(
                new Nat(1),
                bob.get_address(),
                {
                    as: bob,
                }
            );
        }, item.errors.fa2_r10)
        await item.transfer_token_owner( new Nat(1) , bob.get_address() , { as : alice } )
        const new_token_owner = await item.token_owner(new Nat(1), { as: alice })
        assert(new_token_owner.toString() === Option.Some(bob.get_address()).toString())

    })

})

describe('[Item NFT] Pause', async () => {
    it('Set pause should succeed', async () => {
        await item.pause({
            as: alice,
        });
        const is_paused = await item.get_paused();
        assert(is_paused == true);
    });

})

describe('[Item NFT] Transfer ownership', async () => {
    it('Transfer ownership as non owner should fail', async () => {
        await item.unpause({
            as: alice,
        });
        await expect_to_fail(async () => {
            await item.declare_ownership(bob.get_address(), {
                as: bob,
            });
        }, item.errors.INVALID_CALLER);
    });

    it('Transfer ownership as owner should succeed', async () => {
        let owner = await item.get_owner()

        assert(`${owner}` === `${alice.get_address()}`);
        await item.declare_ownership(bob.get_address(), {
            as: alice,
        });
        await item.claim_ownership({
            as: bob,
        });
        owner = await item.get_owner()
        assert(`${owner}` === `${bob.get_address()}`);
    });
})
