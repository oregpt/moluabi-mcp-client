# Project Overview

## Overview

This is a full-stack web application that provides a dashboard interface for managing MoluAbi AI agents through a Model Context Protocol (MCP) server. The application features a React frontend with a comprehensive UI component library, an Express.js backend, and PostgreSQL database integration using Drizzle ORM. The system supports agent creation, management, user access control, file uploads, and real-time chat functionality with AI agents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the main UI framework
- **Vite** as the build tool and development server with hot module replacement
- **TanStack Query (React Query)** for server state management and API caching
- **Wouter** for client-side routing (lightweight React Router alternative)
- **shadcn/ui** component library built on Radix UI primitives for accessible, customizable components
- **Tailwind CSS** for styling with custom design tokens and CSS variables for theming
- **React Hook Form** with Zod validation for form management
- Component structure organized by feature (tools, layout, ui) with clear separation of concerns

### Backend Architecture
- **Express.js** server with TypeScript for the REST API
- **Model Context Protocol (MCP) client** integration for communicating with external MCP servers
- **WebSocket** support for real-time features like chat and status updates
- **Session-based** request logging and error handling middleware
- **In-memory storage** implementation with interface for future database migration
- **Service layer** pattern for ATXP payment integration and MCP client management

### Database Design
- **PostgreSQL** with Drizzle ORM for type-safe database operations
- **Schema-driven** approach with Zod validation integration
- Core entities: users, agents, agent_access, mcp_tool_usage, agent_files
- **UUID-based** user IDs with auto-incrementing integer IDs for other entities
- **JSONB fields** for flexible metadata and request/response storage
- **Timestamp tracking** for all entities with automatic created_at/updated_at

### State Management
- **Server state**: TanStack Query for caching, background updates, and error handling
- **Client state**: React hooks (useState, useEffect) for local component state
- **Form state**: React Hook Form with Zod schemas for validation
- **Cost tracking**: Custom hook with localStorage persistence for usage monitoring

### Real-time Features
- **WebSocket client** with automatic reconnection and message routing
- **Event-based** architecture for handling different message types
- **Connection status** monitoring and user feedback
- **Subscription pattern** for component-level event handling

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver for database connectivity
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect support
- **@modelcontextprotocol/sdk**: Official MCP SDK for client communication
- **@tanstack/react-query**: Server state management with caching and synchronization

### UI and Styling Dependencies
- **@radix-ui/react-***: Complete suite of accessible UI primitives (dialogs, dropdowns, forms, etc.)
- **tailwindcss**: Utility-first CSS framework with custom configuration
- **class-variance-authority**: Component variant system for consistent styling
- **lucide-react**: Icon library with consistent design language

### Development and Build Tools
- **vite**: Fast build tool with TypeScript support and development server
- **tsx**: TypeScript execution engine for development
- **@replit/vite-plugin-***: Replit-specific plugins for development environment integration

### Validation and Forms
- **zod**: Schema validation library integrated with Drizzle and React Hook Form
- **@hookform/resolvers**: React Hook Form integration for Zod validation
- **react-hook-form**: Performant form library with minimal re-renders

### Payment Integration (Future)
- **@atxp/client**: ATXP protocol client for potential pay-per-use functionality (currently in mock mode)
- **connect-pg-simple**: PostgreSQL session store for production session management