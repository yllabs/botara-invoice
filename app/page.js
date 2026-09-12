```jsx
import { redirect } from "next/navigation";
import { getStoreSettings } from "../lib/storeSettings";

export const dynamic = "force-dynamic";

const products = [
  {
    id: "ps5-car-drop",
    name: "PS5 Car Drop",
    price: "$14.99",
    description:
      "A custom GTA V PS5 car drop prepared for your account.",
    tag: "POPULAR"
  },
  {
    id: "modded-account",
    name: "Modded Account",
    price: "$35.00",
    description:
      "A fully upgraded GTA V PS5 account packed with modded cars, outfits, cash and premium properties.",
    tag: "PREMIUM",
    features: [
      "20 Modded Cars",
      "5 Modded Outfits",
      "$38 Million Cash",
      "Properties",
      "Hangar",
      "Arena",
      "Mansion",
      "Bunker",
      "Facility",
      "Nightclub"
    ]
  },
  {
    id: "premium-drop",
    name: "Premium Drop",
    price: "$24.99",
    description:
      "A larger custom drop for players who want more.",
    tag: "NEW"
  }
];

export default async function Home() {
  const settings = await getStoreSettings();

  if (settings.maintenance) {
    redirect("/maintenance");
  }

  return (
    <main>
      <nav className="navbar">
        <a href="/" className="logo">
          DROP<span>FITS</span>
        </a>

        <div className="navLinks">
          <a href="#products">Products</a>
          <a href="#how">How It Works</a>
          <a href="#faq">FAQ</a>
        </div>

        <a href="#products" className="navShop">
          Shop Now
        </a>
      </nav>

      <section className="hero">
        <div className="heroGrid" />

        <div className="floatingOrb orbOne" />
        <div className="floatingOrb orbTwo" />

        <div className="heroText">
          <div className="heroBadge">
            <span />
            GTA V • PS5 MARKETPLACE
          </div>

          <h1>
            YOUR DROP.
            <br />
            <strong>YOUR RIDE.</strong>
          </h1>

          <p>
            Premium GTA V car drops and modded accounts for players
            who want to take their garage to another level.
          </p>

          <div className="heroActions">
            <a href="#products" className="primaryButton">
              Browse Products
            </a>

            <a href="#how" className="outlineButton">
              How It Works
            </a>
          </div>

          <div className="trustRow">
            <div>
              <strong>STRIPE</strong>
              <span>Secure Checkout</span>
            </div>

            <div>
              <strong>PS5</strong>
              <span>Platform Focused</span>
            </div>

            <div>
              <strong>24/7</strong>
              <span>Online Store</span>
            </div>
          </div>
        </div>

        <div className="heroVisual">
          <div className="visualGlow" />

          <div className="carCard">
            <div className="cardTop">
              <span>DROPFITS</span>
              <span>01</span>
            </div>

            <div className="fakeCar">
              <div className="carRoof" />
              <div className="carBody" />
              <div className="wheel wheelLeft" />
              <div className="wheel wheelRight" />
              <div className="headlight headlightLeft" />
              <div className="headlight headlightRight" />
            </div>

            <div className="cardBottom">
              <div>
                <span>DROP</span>
                <strong>01</strong>
              </div>

              <div className="cardArrow">↗</div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div>
          <strong>PREMIUM</strong>
          <span>Digital Products</span>
        </div>

        <div>
          <strong>SECURE</strong>
          <span>Stripe Payments</span>
        </div>

        <div>
          <strong>FAST</strong>
          <span>Digital Delivery</span>
        </div>

        <div>
          <strong>PS5</strong>
          <span>GTA V Marketplace</span>
        </div>
      </section>

      <section id="products" className="section productsSection">
        <div className="sectionHeading">
          <div>
            <span className="eyebrow">THE STORE</span>
            <h2>Pick your drop.</h2>
          </div>

          <p>
            Choose your product and continue through
            our secure Stripe checkout.
          </p>
        </div>

        <div className="productsGrid">
          {products.map((product) => {
            const enabled = settings.payments[product.id];

            return (
              <article className="productCard" key={product.id}>
                <div className="productImage">
                  <div className="productGrid" />
                  <div className="productGlow" />

                  <div className="productLogo">
                    <span>DF</span>
                  </div>

                  <div className="productTag">
                    {product.tag}
                  </div>
                </div>

                <div className="productContent">
                  <div className="productTitle">
                    <div>
                      <h3>{product.name}</h3>

                      <p>{product.description}</p>
                    </div>

                    <strong>{product.price}</strong>
                  </div>

                  {product.features && (
                    <div className="productFeatures">
                      {product.features.map((feature) => (
                        <div
                          className="productFeature"
                          key={feature}
                        >
                          <span>✓</span>
                          {feature}
                        </div>
                      ))}
                    </div>
                  )}

                  {enabled ? (
                    <form action="/api/checkout" method="POST">
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />

                      <button
                        type="submit"
                        className="buyButton"
                      >
                        Buy Now
                        <span>→</span>
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="buyButton"
                      disabled
                    >
                      Currently Unavailable
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="how" className="section howSection">
        <div className="sectionHeading centered">
          <span className="eyebrow">HOW IT WORKS</span>

          <h2>Simple. Fast. Clean.</h2>

          <p>
            Getting your product doesn't need to be complicated.
          </p>
        </div>

        <div className="steps">
          <div className="step">
            <div className="stepNumber">01</div>

            <h3>Choose</h3>

            <p>
              Pick the GTA V product that fits what you're looking for.
            </p>
          </div>

          <div className="step">
            <div className="stepNumber">02</div>

            <h3>Checkout</h3>

            <p>
              Complete your purchase through our secure Stripe checkout.
            </p>
          </div>

          <div className="step">
            <div className="stepNumber">03</div>

            <h3>Receive</h3>

            <p>
              Follow the delivery instructions provided after your purchase.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="section faqSection">
        <div className="sectionHeading">
          <div>
            <span className="eyebrow">QUESTIONS</span>

            <h2>Need to know?</h2>
          </div>
        </div>

        <div className="faqGrid">
          <div className="faqItem">
            <h3>Is payment secure?</h3>

            <p>
              Yes. Payments are processed through Stripe.
              DropFits does not store your complete card information.
            </p>
          </div>

          <div className="faqItem">
            <h3>What platform is supported?</h3>

            <p>
              Current products are designed for GTA V on PS5
              unless the individual product listing says otherwise.
            </p>
          </div>

          <div className="faqItem">
            <h3>Are digital products refundable?</h3>

            <p>
              Digital products may have limited refund eligibility.
              Review the applicable product terms before purchasing.
            </p>
          </div>

          <div className="faqItem">
            <h3>Need support?</h3>

            <p>
              Contact DropFits support with your order information
              and we'll help you with your purchase.
            </p>
          </div>
        </div>
      </section>

      <footer>
        <div>
          <a href="/" className="logo">
            DROP<span>FITS</span>
          </a>

          <p>
            Premium GTA V digital marketplace.
          </p>
        </div>

        <div className="footerRight">
          <span>© 2026 DropFits</span>

          <span>
            Not affiliated with Rockstar Games.
          </span>
        </div>
      </footer>
    </main>
  );
}
```
