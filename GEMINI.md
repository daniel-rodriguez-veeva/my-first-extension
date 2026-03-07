# my-first-extension Context

This extension enables interaction with Veeva Vault (v25.3) using the Model Context Protocol (MCP).

## Tool Overview

The extension tools are structured to align with the Veeva Vault API documentation. All tool names are prefixed with `vault_`.

### Core Tools

#### 1. `vault_auth`
**Purpose**: Manage authentication sessions and discovery.
**Actions**: `end_session`, `list_delegations`, `initiate_delegated_session`, `discovery`.

#### 2. `vault_api_call`
**Purpose**: Generic API caller for any endpoint not covered by specific tools.
**Input**: `endpoint`, `method`, `body`.

#### 3. `vault_query`
**Purpose**: Execute read-only queries using VQL (Vault Query Language).
**When to use**: "Find documents where...", "List active users...", "Get ID of product X".
**Input**: `query` (string).

#### 4. `vault_metadata` (MDL)
**Purpose**: Introspection and modification of Vault Metadata (MDL).
**Actions**: `mdl`, `list_components`, `get_component`, `mdl_async`.