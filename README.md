# DropFits

DropFits is a GTA V digital marketplace built with Next.js and Stripe.

## Stack

- Next.js
- React
- Stripe Checkout
- Vercel
- No database

## Environment Variables

Add this variable in Vercel:

STRIPE_SECRET_KEY

## Deployment

Push the project to GitHub.

Import the repository into Vercel.

Add the STRIPE_SECRET_KEY environment variable.

Deploy the project.

## Stripe

The checkout route creates Stripe Checkout Sessions dynamically based on the selected product.

Products are currently configured in:

app/api/checkout/route.js

## Products

PS5 Car Drop - $14.99

Modded Account - $39.99

Premium Drop - $24.99

## Important

DropFits is an independent marketplace and is not affiliated with Rockstar Games.
