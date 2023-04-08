import { Bytes, Key, Nat, Option, Tez, Or, pair_to_mich, Signature, string_to_mich, Rational } from '@completium/archetype-ts-types'
import { blake2b, expect_to_fail, get_account, set_mockup, set_mockup_now, set_quiet } from '@completium/experiment-ts'

import { item, balance_of_request, transfer_param, transfer_destination, add_for_all } from './binding/item';
import { market } from './binding/market';

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

describe('[Marketplace] Contracts deployment', async () => {
    it('Item contract deployment shoud succeed', async () => {
        await item.deploy(alice.get_address(), { as: alice })
        await market.deploy(alice.get_address(), { as: alice })
    })
})

describe('[Marketplace] Trade', async () => {

    it('Alice mints NFTs should succeed', async () => {
        await item.authorise([["", new Bytes("")]], intial_amount, price, max_supply, { as: alice })

        // check balance
        const my_balance = await item.balance_of([new balance_of_request(alice.get_address(), new Nat(1))], { as: alice })
        assert(my_balance[0].balance_.equals(new Nat(1)))
    })

    it('Alice lists NFTs to market contract should succeed', async () => {

        // create an order
        await market.create( new Nat(1), item.get_address(), new Nat(1), new Nat(1), new Tez(1), { as : alice})

        const value = await market.get_order_value( new Nat(1))

        assert(value?.asset_address.equals( item.get_address()))
        assert(value?.otoken_id.equals( new Nat(1)))
        assert(value?.price.equals( new Tez(1)))
        assert(value?.token_value.equals( new Nat(1)))

    })

    it('Bob buys NFTs to market contract should succeed', async () => {
        // make an approval for Alice
        await item.update_operators_for_all( [ new add_for_all( market.get_address()) ] , { as : alice}  )

        await market.swap( new Nat(1) , { as : bob, amount : new Tez(1)})

        // check balance
        const alice_balance = await item.balance_of([new balance_of_request(alice.get_address(), new Nat(1))], { as: alice })
        assert(alice_balance[0].balance_.equals(new Nat(0)))

        const bob_balance = await item.balance_of([new balance_of_request(bob.get_address(), new Nat(1))], { as: bob })
        assert(bob_balance[0].balance_.equals(new Nat(1)))

        // order should inactive
        const value = await market.get_order_value( new Nat(1))
        assert(value?.ended == true)
    })

    it('Update fees should succeed', async () => {
        
        // create new order
        await market.create( new Nat(2), item.get_address(), new Nat(1), new Nat(1), new Tez(1), { as : bob})

        const value = await market.get_order_value( new Nat(2))

        assert(value?.fee.to_number() === 0.1)
        assert(value?.royalty.to_number() === 0.1)

        await market.update_fee(new Nat(2), new Rational(0.15), { as: alice})
        await market.update_royalty(new Nat(2), new Rational(0.2), { as: alice})

        const updated_value = await market.get_order_value( new Nat(2))

        assert(updated_value?.fee.to_number() === 0.15)
        assert(updated_value?.royalty.to_number() === 0.2)
    })

})