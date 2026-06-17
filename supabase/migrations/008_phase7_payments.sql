-- LaundryOS — Phase 7: Enhanced Payments (Partial, FIFO Allocation, Credit Notes)

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENT ALLOCATIONS  (FIFO tracking — which payment cleared which invoice)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists payment_allocations (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  payment_id       uuid not null references payments(id) on delete cascade,
  invoice_id       uuid not null references invoices(id) on delete cascade,
  amount_allocated numeric(10,3) not null,
  created_at       timestamptz default now()
);

alter table payment_allocations enable row level security;

create policy payment_alloc_tenant on payment_allocations
  using (tenant_id = (select tenant_id from user_profiles where id = auth.uid()));

create index if not exists idx_payment_alloc_tenant  on payment_allocations(tenant_id);
create index if not exists idx_payment_alloc_payment on payment_allocations(payment_id);
create index if not exists idx_payment_alloc_invoice on payment_allocations(invoice_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- CREDIT NOTES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists credit_notes (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  customer_id           uuid not null references customers(id),
  invoice_id            uuid references invoices(id),      -- source invoice (optional)
  amount                numeric(10,3) not null,
  reason                text not null,
  status                text default 'open'
    check (status in ('open','applied','voided')),
  applied_to_invoice_id uuid references invoices(id),
  created_by            uuid references user_profiles(id),
  created_at            timestamptz default now()
);

alter table credit_notes enable row level security;

create policy credit_notes_tenant on credit_notes
  using (tenant_id = (select tenant_id from user_profiles where id = auth.uid()));

create index if not exists idx_credit_notes_tenant   on credit_notes(tenant_id);
create index if not exists idx_credit_notes_customer on credit_notes(customer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTION: allocate a payment across oldest unpaid invoices (FIFO)
-- Returns: JSON with allocations made and any excess sent to wallet
-- Called by server actions; runs as SECURITY DEFINER so it bypasses RLS
-- safely — the server action already verifies tenant ownership.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function allocate_payment_fifo(
  p_tenant_id   uuid,
  p_customer_id uuid,
  p_payment_id  uuid,
  p_amount      numeric,
  p_actor_id    uuid
)
returns jsonb
language plpgsql security definer as $$
declare
  v_remaining   numeric := p_amount;
  v_inv         record;
  v_alloc       numeric;
  v_allocations jsonb  := '[]'::jsonb;
  v_wallet_id   uuid;
  v_inv_paid    numeric;
begin
  -- Walk oldest unpaid/partial invoices for this customer
  for v_inv in
    select i.id, i.total,
           coalesce(sum(pa.amount_allocated), 0) as already_paid
      from invoices i
      left join payment_allocations pa on pa.invoice_id = i.id
     where i.tenant_id   = p_tenant_id
       and i.customer_id = p_customer_id
       and i.status in ('unpaid', 'partial', 'overdue')
     group by i.id, i.total
     order by i.created_at asc
  loop
    exit when v_remaining <= 0;

    v_inv_paid := v_inv.already_paid;
    v_alloc    := least(v_remaining, v_inv.total - v_inv_paid);

    if v_alloc <= 0 then continue; end if;

    insert into payment_allocations (tenant_id, payment_id, invoice_id, amount_allocated)
      values (p_tenant_id, p_payment_id, v_inv.id, v_alloc);

    -- Update invoice status
    if v_inv_paid + v_alloc >= v_inv.total then
      update invoices set status = 'paid' where id = v_inv.id;
    else
      update invoices set status = 'partial' where id = v_inv.id;
    end if;

    v_allocations := v_allocations || jsonb_build_object(
      'invoice_id', v_inv.id, 'amount', v_alloc
    );
    v_remaining := v_remaining - v_alloc;
  end loop;

  -- Any remaining amount → customer wallet
  if v_remaining > 0 then
    -- Upsert wallet
    insert into customer_wallets (tenant_id, customer_id, balance)
      values (p_tenant_id, p_customer_id, 0)
      on conflict (tenant_id, customer_id) do nothing;

    select id into v_wallet_id
      from customer_wallets
     where tenant_id = p_tenant_id and customer_id = p_customer_id;

    insert into customer_wallet_transactions
      (tenant_id, customer_id, wallet_id, txn_type, amount, description, reference_id, reference_type, actor_id)
    values
      (p_tenant_id, p_customer_id, v_wallet_id, 'credit', v_remaining,
       'Overpayment credited to wallet', p_payment_id, 'invoice', p_actor_id);
  end if;

  return jsonb_build_object('allocations', v_allocations, 'wallet_credit', v_remaining);
end;
$$;
