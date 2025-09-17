// prisma/seed.ts
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

// optionally read plaintext passwords from env (for convenience)
// if not provided, defaults below will be used
const ADMIN_PLAIN = process.env.SEED_ADMIN_PW ?? 'admin-password';
const SELLER_PLAIN = process.env.SEED_SELLER_PW ?? 'seller-password';
const BUYER_PLAIN = process.env.SEED_BUYER_PW ?? 'buyer-password';

async function hash(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function safeParseDecimal(value: number | string) {
  // prisma Decimal expects string for safety
  return typeof value === 'number' ? value.toFixed(2) : value;
}

async function main() {
  console.log('Hashing passwords (bcrypt) with saltRounds=', SALT_ROUNDS);

  // hash passwords
  const [adminHashed, sellerHashed, buyerHashed] = await Promise.all([
    hash(ADMIN_PLAIN),
    hash(SELLER_PLAIN),
    hash(BUYER_PLAIN),
  ]);

  console.log('Creating users...');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Platform Admin',
      password: adminHashed,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: 'seller@example.com',
      name: 'Ali Seller',
      password: sellerHashed,
      isVerified: true,
      isSeller: true,
      isSellerVerified: true,
    },
  });

  const buyer = await prisma.user.create({
    data: {
      email: 'buyer@example.com',
      name: 'Sara Buyer',
      password: buyerHashed,
      isVerified: true,
    },
  });

  console.log('Users created:', { admin: admin.id, seller: seller.id, buyer: buyer.id });

  // Verifications
  await prisma.verification.createMany({
    data: [
      {
        userId: seller.id,
        docType: 'NATIONAL_ID',
        docFront: 's3://example/seller-id-front.jpg',
        docBack: 's3://example/seller-id-back.jpg',
        status: 'APPROVED',
      },
      {
        userId: buyer.id,
        docType: 'NATIONAL_ID',
        docFront: 's3://example/buyer-id-front.jpg',
        status: 'APPROVED',
      },
    ],
  });

  // Wallets
  const sellerWallet = await prisma.wallet.create({
    data: {
      userId: seller.id,
      balance: '200000.00',
      currency: 'IRR',
    },
  });

  const buyerWallet = await prisma.wallet.create({
    data: {
      userId: buyer.id,
      balance: '500000.00',
      currency: 'IRR',
    },
  });

  const adminWallet = await prisma.wallet.create({
    data: {
      userId: admin.id,
      balance: '0.00',
      currency: 'IRR',
    },
  });

  // Wallet transactions (seed)
  await prisma.walletTransaction.createMany({
    data: [
      {
        walletId: buyerWallet.id,
        type: 'DEPOSIT',
        amount: '500000.00',
        balanceAfter: '500000.00',
        refType: 'SEED',
      },
      {
        walletId: sellerWallet.id,
        type: 'SALE_INCOME',
        amount: '200000.00',
        balanceAfter: '200000.00',
        refType: 'SEED',
      },
    ],
  });

  // Edition + Listing
  const edition = await prisma.edition.create({
    data: {
      title: 'Introduction to Clinical Medicine',
      subtitle: 'Second-hand edition',
      authors: ['John Doe', 'Jane Smith'],
      publisher: 'MedPub',
      publishedYear: 2015,
      language: 'en',
      description: 'A practical textbook for medical students.',
      coverKey: 's3://example/covers/clinical-medicine.jpg',
    },
  });

  const listing = await prisma.listing.create({
    data: {
      editionId: edition.id,
      sellerId: seller.id,
      price: '250000.00',
      currency: 'IRR',
      condition: 'VERY_GOOD',
      quantity: 1,
      status: 'APPROVED',
      images: {
        create: [
          { key: 's3://example/listings/listing1-photo1.jpg', altText: 'Book front', order: 0 },
          { key: 's3://example/listings/listing1-photo2.jpg', altText: 'Book back', order: 1 },
        ],
      },
    },
  });

  // Order + OrderItem + Payment
  const order = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      subtotal: '250000.00',
      shippingAmount: '10000.00',
      platformFee: '25000.00',
      totalAmount: '285000.00',
      currency: 'IRR',
      status: 'PAID',
      items: {
        create: [
          {
            listingId: listing.id,
            editionId: edition.id,
            sellerId: seller.id,
            quantity: 1,
            unitPrice: '250000.00',
            lineTotal: '250000.00',
            sellerPayout: '225000.00',
            platformFee: '25000.00',
          },
        ],
      },
      paymentRef: 'SEED-GATEWAY-REF-12345',
    },
    include: { items: true },
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      gateway: 'mock-gateway',
      gatewayRef: 'SEED-GATEWAY-REF-12345',
      amount: order.totalAmount,
      currency: 'IRR',
      status: 'SUCCEEDED',
      paidAt: new Date(),
    },
  });

  // Wallet transactions for the order (simple simulation)
  // NOTE: in production do this inside a DB transaction with locking
  // buyer pay
  const buyerNewBalance = (parseFloat(buyerWallet.balance as unknown as string) - parseFloat(order.totalAmount as unknown as string)).toFixed(2);
  await prisma.walletTransaction.create({
    data: {
      walletId: buyerWallet.id,
      type: 'ORDER_PAYMENT',
      amount: order.totalAmount,
      balanceAfter: buyerNewBalance,
      refType: 'ORDER',
      refId: order.id,
    },
  });

  // credit seller (simulated)
  const sellerNewBalance = (parseFloat(sellerWallet.balance as unknown as string) + parseFloat(order.items[0].sellerPayout as unknown as string)).toFixed(2);
  await prisma.walletTransaction.create({
    data: {
      walletId: sellerWallet.id,
      type: 'SALE_INCOME',
      amount: order.items[0].sellerPayout,
      balanceAfter: sellerNewBalance,
      refType: 'ORDER',
      refId: order.id,
    },
  });

  // Support ticket sample
  const ticket = await prisma.supportTicket.create({
    data: {
      title: 'سوال درباره وضعیت ارسال',
      description: 'من می‌خواستم بدونم کتاب کی ارسال میشه؟',
      creatorId: buyer.id,
      assigneeId: admin.id,
      status: 'OPEN',
      priority: 'MEDIUM',
      messages: {
        create: [
          {
            authorId: buyer.id,
            body: 'سلام، سفارش من ثبت شده ولی وضعیت ارسال تغییر نکرده.',
            isFromAdmin: false,
            attachments: {
              create: [{ key: 's3://example/support/attachment1.png', filename: 'screenshot.png' }],
            },
          },
          {
            authorId: admin.id,
            body: 'سلام، بررسی شد. فروشنده در حال آماده‌سازی مرسوله هست.',
            isFromAdmin: true,
          },
        ],
      },
    },
  });

  // WithdrawRequest & Payout sample
  const withdrawReq = await prisma.withdrawRequest.create({
    data: {
      userId: seller.id,
      amount: '100000.00',
      bankInfo: {
        cardNumber: '6037990000000000',
        shaba: 'IR000000000000000000000',
        bankName: 'Sample Bank',
      },
      status: 'PENDING',
    },
  });

  const payout = await prisma.payout.create({
    data: {
      userId: seller.id,
      amount: '100000.00',
      currency: 'IRR',
      fee: '1000.00',
      status: 'REQUESTED',
      meta: { withdrawRequestId: withdrawReq.id },
    },
  });

  // Admin audit log
  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      action: 'KYC_APPROVE',
      targetType: 'USER',
      targetId: seller.id,
      meta: { note: 'approved seller KYC in seed' },
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
