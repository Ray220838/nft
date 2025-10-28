# XRPL NFT Whitelist Application

A fullstack web application for managing NFT whitelist registrations with XRPL wallet integration, admin controls, and NFT verification.

## Features

- ✅ **Wallet-Only Admin Authentication** - Fully DeFi admin access using XRPL wallet signatures (no passwords)
- ✅ **Whitelist Registration** - Users can register with wallet address, name, email, and shipping address
- ✅ **NFT Collection Management** - Admins can add/remove NFT collections for verification
- ✅ **NFT Ownership Verification** - Verify users hold NFTs from registered collections
- ✅ **Admin Dashboard** - View whitelist entries, download data (JSON/TXT), manage collections
- ✅ **Multi-Wallet Support** - Browser wallets (Gem Wallet, Crossmark) and Xaman (QR code)
- ✅ **Admin Management** - Super admins can add/remove other admin wallets
- ✅ **Persistent Database** - SQLite with volume mounting for data persistence
- ✅ **Responsive Design** - Beautiful dark theme with gold accents

## Tech Stack

**Backend:**
- FastAPI (Python 3.12)
- SQLAlchemy (SQLite)
- xrpl-py (XRPL integration)
- JWT authentication
- Poetry (dependency management)

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- Axios (API client)

## Project Structure

```
xrpl-nft-whitelist/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── models.py         # Pydantic models
│   │   ├── db_models.py      # SQLAlchemy models
│   │   ├── auth.py           # JWT authentication
│   │   ├── wallet_auth.py    # Wallet signature verification
│   │   └── xrpl_service.py   # XRPL integration
│   ├── pyproject.toml        # Poetry dependencies
│   └── poetry.lock
├── frontend/
│   ├── src/
│   │   ├── pages/            # React pages
│   │   ├── components/       # React components
│   │   └── services/         # API and wallet services
│   ├── package.json
│   └── .env                  # Environment variables
├── Dockerfile                # Multi-stage build
├── fly.toml                  # Fly.io configuration
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- Poetry
- Fly CLI (for deployment)

### Local Development

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd xrpl-nft-whitelist
```

2. **Backend Setup**
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Environment Variables

**Backend (.env in backend/):**
```bash
# Copy from .env.example
cp backend/.env.example backend/.env

# Required variables:
SECRET_KEY=your-secret-key-here              # Generate with: openssl rand -hex 32
SUPER_ADMIN_WALLET=rKhHA3suVVRtJpUQE5vZntyMTWvd9hBxg1  # Your XRPL wallet address
APP_DOMAIN=localhost:8000                    # For local dev
DATABASE_URL=sqlite:///./app.db              # SQLite database path
```

**Frontend (.env in frontend/):**
```bash
# Copy from .env.example
cp frontend/.env.example frontend/.env

# Required variables:
VITE_API_URL=http://localhost:8000           # Backend API URL (empty for production)
VITE_XUMM_API_KEY=                           # Optional: Xaman wallet support
```

**Important:** Never commit `.env` files to version control. Use `.env.example` as a template.

## Deployment to Fly.io

### First-Time Setup

1. **Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login to Fly.io**
```bash
fly auth login
```

3. **Create Fly.io app**
```bash
fly apps create xrpl-nft-whitelist
```

4. **Create volume for persistent database**
```bash
fly volumes create data --size 1 --region iad
```

5. **Set secrets**
```bash
fly secrets set SECRET_KEY=your-secret-key-here
fly secrets set SUPER_ADMIN_WALLET=rKhHA3suVVRtJpUQE5vZntyMTWvd9hBxg1
```

6. **Deploy**
```bash
fly deploy
```

### Updating Deployment

After making changes, simply run:
```bash
fly deploy
```

### View Logs

```bash
fly logs
```

### Access Deployed App

Your app will be available at: `https://xrpl-nft-whitelist.fly.dev`

## Admin Access

### Wallet-Only Authentication (Fully DeFi)

This application uses **wallet-only authentication** - no passwords required! Only wallets in the admin list can access the dashboard.

### Super Admin Wallet

The super admin wallet is configured in the environment variables:
- Default: `rKhHA3suVVRtJpUQE5vZntyMTWvd9hBxg1`
- This wallet is automatically added as super admin on first startup
- Super admins cannot be removed

### How to Login

1. Navigate to `/admin/login`
2. The wallet connection modal opens automatically
3. Connect your XRPL wallet:
   - **Gem Wallet** (recommended) - Browser extension
   - **Crossmark** - Browser extension
   - **Xaman** - Mobile wallet with QR code
4. Sign the authentication challenge message
5. If your wallet is authorized, you'll be redirected to the admin dashboard
6. If access is denied, you can try a different wallet

### Admin Roles

**Super Admin:**
- Add/remove other admin wallets
- Promote admins to super admin
- All admin permissions

**Admin:**
- View all whitelist entries
- Download data (JSON/TXT/Addresses)
- Add/remove NFT collections
- Clear whitelist entries
- Clear NFT collections

### Admin Management

Super admins can manage admin wallets from the "Admin Management" tab:
1. Navigate to Admin Dashboard → Admin Management
2. Click "Add Admin" to add a new wallet
3. Enter the XRPL wallet address (starts with 'r')
4. Select role (admin or super_admin)
5. Click "Add Admin"

To remove an admin:
1. Find the admin in the list
2. Click the delete button (trash icon)
3. Confirm removal

**Note:** Super admins cannot be removed through the UI

## API Endpoints

### Public Endpoints

- `POST /api/whitelist` - Create whitelist entry
- `POST /api/nfts/verify` - Verify NFT ownership
- `GET /api/collections` - Get NFT collections

### Authentication Endpoints

- `POST /api/auth/challenge` - Request authentication challenge
- `POST /api/auth/verify` - Verify wallet signature and get JWT token

### Admin Endpoints (Requires JWT)

- `GET /api/whitelist` - Get all whitelist entries
- `DELETE /api/admin/whitelist` - Clear all whitelist entries
- `GET /api/admin/download/json` - Download whitelist as JSON
- `GET /api/admin/download/txt` - Download whitelist as TXT
- `GET /api/admin/download/addresses` - Download wallet addresses
- `POST /api/collections` - Create NFT collection
- `DELETE /api/collections/{id}` - Delete NFT collection
- `DELETE /api/admin/collections` - Clear all NFT collections
- `GET /api/admin/wallets` - Get all admin wallets (super admin only)
- `POST /api/admin/wallets` - Add admin wallet (super admin only)
- `DELETE /api/admin/wallets/{address}` - Remove admin wallet (super admin only)

## Database Schema

### WhitelistEntry
- id (UUID)
- full_name
- email
- wallet_address (unique)
- street_address
- city
- state_province
- zip_postal
- country
- phone_number (optional)
- created_at

### NFTCollection
- id (UUID)
- name
- issuer (XRPL address)
- taxon (optional)
- created_at

### AdminWallet
- id (UUID)
- wallet_address (unique)
- role (super_admin | admin)
- added_by (wallet address)
- created_at

### AuthChallenge
- id (UUID)
- wallet_address
- nonce
- message
- expires_at
- used (boolean)
- created_at

## Security

- Wallet signature verification using xrpl-py
- JWT tokens with expiration
- Challenge-response authentication (5-minute expiry)
- Single-use challenges (replay attack prevention)
- Super admin role for sensitive operations
- HTTPS enforced in production

## Development

### Running Tests

```bash
cd backend
poetry run pytest
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# The Dockerfile handles both frontend and backend build
docker build -t xrpl-nft-whitelist .
```

## Troubleshooting

### Database Issues

If you need to reset the database:
```bash
rm backend/app.db
poetry run uvicorn app.main:app --reload
```

### Fly.io Volume Issues

If data is not persisting:
```bash
fly volumes list
fly volumes create data --size 1 --region iad
```

### Wallet Connection Issues

- Ensure browser wallet extensions are installed
- Check that VITE_XUMM_API_KEY is set for Xaman integration
- Verify wallet address format (must start with 'r')

## Support

For issues or questions:
- Check the API documentation at `/docs`
- Review Fly.io logs with `fly logs`
- Verify environment variables are set correctly

## License

MIT License - See LICENSE file for details

## Credits

Built with ❤️ for the XRPL community
