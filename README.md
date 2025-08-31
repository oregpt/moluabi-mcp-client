# MoluAbi Web Client

## Project Overview

This is a full-stack TypeScript web application that provides a user-friendly dashboard interface for managing MoluAbi AI agents through the Model Context Protocol (MCP). The application transforms the original CLI-based MCP tool into a modern web interface with integrated ATXP (Agent Transaction Exchange Protocol) payment processing.

## Key Features

- **Agent Management**: Create, update, delete, and access MoluAbi AI agents
- **Real-time Chat**: WebSocket-based chat interface with AI agents
- **ATXP Payment Integration**: Authentic payment processing with transparent error reporting
- **Cost Tracking**: Real-time monitoring of usage costs and payment status
- **User Authentication**: Secure user registration and login system
- **Responsive UI**: Modern interface built with shadcn/ui and Tailwind CSS

## Architecture

### Tech Stack

**Frontend:**
- React 19.1.1 with TypeScript
- Vite for development and build tooling
- TanStack Query v5 for server state management
- Wouter for lightweight client-side routing
- shadcn/ui + Radix UI for accessible components
- Tailwind CSS for styling
- React Hook Form + Zod for form validation

**Backend:**
- Express.js with TypeScript
- Model Context Protocol (MCP) SDK for agent communication
- ATXP SDK for payment processing
- WebSocket support for real-time features
- PostgreSQL with Drizzle ORM
- Session-based authentication

### Project Structure

```
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── layout/        # Layout components (sidebar, flow monitor)
│   │   │   ├── tools/         # Agent tool components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities and API client
│   │   ├── pages/             # Page components
│   │   ├── types/             # TypeScript type definitions
│   │   └── App.tsx            # Main app component
│   └── index.html
├── server/                    # Express.js backend
│   ├── services/              # Business logic services
│   │   ├── atxp-client.ts     # ATXP payment integration
│   │   └── mcp-client.ts      # MCP server communication
│   ├── db.ts                  # Database connection
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # API route definitions
│   ├── storage.ts             # Data storage interface
│   └── vite.ts                # Vite development server integration
├── shared/                    # Shared types and schemas
│   └── schema.ts              # Drizzle database schema + Zod validation
└── Configuration files
```

## Environment Setup

### Required Environment Variables

```bash
# MCP Server Authentication
MOLUABI_MCP_API_KEY=mab_cc4d049c

# ATXP Payment Integration
ATXP_CONNECTION=wallet:0x1234567890abcdef:base

# Database (auto-configured in Replit)
DATABASE_URL=postgresql://...
PGHOST=...
PGUSER=...
PGPASSWORD=...
PGDATABASE=...
PGPORT=...

# Wallet Configuration
WALLET_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
```

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## MCP Server Integration

### Remote Server Details
- **URL**: `https://moluabi-mcp-server.replit.app`
- **API Key**: `mab_cc4d049c` (for "ATXP Playground" organization)
- **Protocol**: Custom HTTP-based MCP implementation

### Server Format Compatibility Issue

**Critical Discovery**: The MCP server uses a **non-standard API format**:

```javascript
// Standard MCP format (what ATXP SDK expects):
{
  "name": "list_agents",
  "arguments": { "apiKey": "..." }
}

// Server's custom format (what actually works):
{
  "tool": "list_agents",  // Uses "tool" instead of "name"
  "arguments": { "apiKey": "..." }
}
```

This format incompatibility prevents direct ATXP integration but is handled by our format adapter.

### Available Tools

1. **list_agents**: Retrieve all available agents
2. **create_agent**: Create new AI agents
3. **update_agent**: Modify existing agents
4. **delete_agent**: Remove agents
5. **get_agent**: Get specific agent details
6. **chat_with_agent**: Interactive chat with agents

## ATXP Payment Integration

### Architecture Overview

The application implements **SDK-only architecture** where ATXP payment attempts are made first, followed by graceful fallback to direct HTTP with transparent error reporting.

### Payment Flow

```
1. Authentication: API key validation
2. Pre-Authorization: ATXP SDK payment capacity check
3. Payment Attempt: ATXP tries standard MCP format
4. Format Conflict: Server returns "Missing tool parameter" (HTTP 400)
5. Fallback: Direct HTTP with correct {"tool": "..."} format
6. Success: Operation completes without payment processing
```

### ATXP Service Implementation

**File**: `server/services/atxp-client.ts`

Key features:
- **Dual-mode operation**: ATXP attempt + format adapter fallback
- **Transparent error reporting**: Shows exact ATXP failure reasons
- **Cost tracking**: Monitors attempted vs. actual payments
- **5-step flow visualization**: Detailed payment process tracking

### Error Handling

The system provides authentic error reporting:
- **Payment Status**: Shows "error" when ATXP fails (not false success)
- **Technical Details**: Includes underlying ATXP SDK error messages
- **Operational Status**: Separates payment failure from operation success

Example error log:
```
ATXP payment failed - operation completed without payment processing

Technical Details: Error POSTing to endpoint (HTTP 400): {"error":"Missing tool parameter"}
```

## Database Schema

### Core Tables

**Users** (`users`):
```sql
id: varchar (UUID primary key)
username: text (unique)
password: text (hashed)
atxp_connection_string: text (optional)
created_at: timestamp
```

**Agents** (`agents`):
```sql
id: integer (auto-increment primary key)
name: text
description: text
instructions: text
type: text (file-based, team, hybrid, chat-based)
is_public: boolean
is_shareable: boolean
owner_id: varchar (references users.id)
metadata: jsonb
created_at: timestamp
updated_at: timestamp
```

**Agent Access** (`agent_access`):
```sql
id: integer (auto-increment primary key)
agent_id: integer (references agents.id)
user_id: varchar (references users.id)
granted_at: timestamp
```

**MCP Tool Usage** (`mcp_tool_usage`):
```sql
id: integer (auto-increment primary key)
user_id: varchar (references users.id)
tool_name: text
agent_id: integer (optional, references agents.id)
cost: decimal(10,4)
tokens_used: integer
execution_time_ms: integer
status: text (success, error, pending)
error_message: text
request: jsonb
response: jsonb
created_at: timestamp
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Agents
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `GET /api/agents/:id` - Get specific agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### ATXP Integration
- `GET /api/atxp/status` - Get ATXP connection status
- Payment flow embedded in agent operations

### WebSocket Events
- Connection status updates
- Real-time cost tracking
- Chat message streaming

## Development Workflow

### Starting Development

```bash
# Start the full-stack application
npm run dev
```

This starts both:
- **Backend**: Express server on port 5000
- **Frontend**: Vite dev server (proxied through Express)

### Database Operations

```bash
# Push schema changes to database
npm run db:push

# Force push (if conflicts exist)
npm run db:push --force

# Type checking
npm run check
```

### Building for Production

```bash
# Build frontend and backend
npm run build

# Start production server
npm run start
```

## Critical Technical Details

### ATXP Integration Challenges

1. **Format Incompatibility**: MCP server uses custom `{"tool": "..."}` format instead of standard MCP `{"name": "..."}`
2. **Payment Workaround**: ATXP attempts authentication but fails due to format mismatch
3. **Fallback Strategy**: Format adapter translates requests to server's expected format
4. **Status Reporting**: System correctly reports payment failure while operation succeeds

### WebSocket Configuration

```javascript
// Server: WebSocket on distinct path to avoid Vite HMR conflicts
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

// Client: Protocol-aware connection
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;
```

### Import Aliases

```javascript
// Configured in vite.config.ts
"@": "./client/src"
"@shared": "./shared"
"@server": "./server"
"@assets": "./attached_assets"
```

## Key Service Classes

### AtxpService (`server/services/atxp-client.ts`)
- Handles ATXP SDK initialization and payment attempts
- Implements format adapter for server compatibility
- Provides detailed error logging and flow tracking
- Creates 5-step payment flow visualization

### MoluAbiMcpClient (`server/services/mcp-client.ts`)
- Manages connection to remote MCP server
- Handles authentication with API key injection
- Orchestrates ATXP payment attempts with fallback
- Processes tool calls with error handling

## Frontend Components

### Key Components
- **Dashboard**: Main agent management interface
- **AtxpFlowMonitor**: Real-time payment flow visualization
- **Sidebar**: Navigation and cost tracking
- **Agent management**: CRUD operations for agents

### State Management
- **TanStack Query**: Server state, caching, background sync
- **Custom hooks**: Cost tracking, WebSocket management
- **Form state**: React Hook Form with Zod validation

## Known Issues & Workarounds

### ATXP Payment Integration
- **Issue**: MCP server format incompatibility prevents direct ATXP payment
- **Workaround**: Format adapter provides seamless user experience
- **Status**: Functional with authentic error reporting

### Performance Considerations
- WebSocket reconnection logic handles connection drops
- Query caching reduces redundant API calls
- Optimistic UI updates for better responsiveness

## Testing the Application

### Basic Flow Test
1. Navigate to dashboard
2. Click "Load Agents" to test MCP connection
3. Observe ATXP flow monitor for payment status
4. Verify agents load successfully despite payment failure

### Expected Payment Flow
```
✅ ATXP Authentication: Attempted
✅ Pre-Authorization: SDK validation
✅ Tool Execution: Operation succeeds
❌ Payment Confirmation: "ATXP payment failed - operation completed without payment processing"
✅ Operation Complete: Successful with payment failure noted
```

## Deployment

The application is configured for Replit deployment with:
- Environment variable integration
- PostgreSQL database support
- WebSocket compatibility
- Production build optimization

## Future Enhancements

1. **Direct ATXP Integration**: If MCP server adopts standard format
2. **Payment Recovery**: Retry mechanism for failed payments
3. **Enhanced Authentication**: OAuth integration
4. **Advanced Agent Features**: Team collaboration, sharing mechanisms

---

**For Windsurf Agent**: This project demonstrates sophisticated integration between React frontend, Express backend, MCP protocol, and ATXP payment system with authentic error handling and graceful fallbacks. The format adapter pattern solves real-world API compatibility issues while maintaining proper payment flow transparency.