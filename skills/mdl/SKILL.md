# MDL Documentation - Veeva Vault

Use **MDL (Metadata Definition Language)** to manage Vault configuration. Like DDL (Data Definition Language) in databases, you can use MDL to create, describe (read), update, and drop (delete) Vault components that make up its configuration.

MDL is a powerful tool for manipulating components programmatically, primarily for automating tasks. While it mimics the behavior of Vault's Admin UI, it is not intended for basic configuration tasks or ongoing maintenance. For standard tasks, use the Admin UI.

---

## MDL Commands

MDL uses CRUD-like commands to manage components. You can use `CREATE`, `RECREATE`, `RENAME`, `ALTER`, and `DROP` commands.

### Command Syntax
Most MDL commands follow this general syntax:
```sql
COMMAND Componenttypename component_name (
    attribute_name(attribute_value),
    attribute_name(attribute_value),
    Subcomponenttypename subcomponent_name (
        attribute_name(attribute_value),
        attribute_name(attribute_value)
    )
);
```

### Core Commands
*   **CREATE**: Creates a new MDL component. Fails if the component already exists.
*   **RECREATE**: An "upsert" command. Creates a new component or alters an existing one.
*   **RENAME**: Renames a custom component (suffixed with `__c`).
*   **DROP**: Deletes a component and its associated subcomponents.
*   **ALTER**: Modifies an existing component. Supports `ADD`, `MODIFY`, `RENAME`, and `DROP` for subcomponents.

---

## Vault Components & Subcomponents

Vault groups component types into:
1.  **Metadata Types**: Manage configuration (e.g., `Picklist`, `Object`, `Docfield`).
2.  **Code Types**: Extend functional behavior (e.g., `Recordtrigger`, `Documentaction`).

### Subcomponents
Some components have child components called subcomponents (e.g., `Picklistentry` for a `Picklist`). Deleting a parent component with `DROP` also deletes its subcomponents.

### Component Names & Namespaces
*   **Standard**: Suffixed with `__v` (Veeva standard). Cannot be deleted; only certain attributes (like labels) can be changed.
*   **Custom**: Suffixed with `__c`.
*   **Code Components**: Defined by their fully-qualified Java class name (e.g., `Recordtrigger.com.veeva.vault.custom.triggers.HelloWorld`).

---

## Getting Started Tutorial

### Step 1: Create a Picklist
```sql
RECREATE Picklist vmdl_options__c (
    label('vMDL Options'),
    active(true),
    Picklistentry hello_world__c(
        value('hello world'),
        order(0),
        active(true)
    )
);
```

### Step 2: Create an Object
```sql
RECREATE Object vmdl_hello_world__c (
    label('vMDL Hello World'),
    label_plural('vMDL Hello World'),
    active(true),
    in_menu(true),
    object_class('base'),
    Field option__c(
        label('Option'),
        type('Picklist'),
        active(true),
        picklist('Picklist.vmdl_options__c')
    )
);
```

### Step 4: Alter Object and Picklist
```sql
ALTER Picklist vmdl_options__c (
    MODIFY Picklistentry hello_world__c(
        value('Hello World.'),
        order(0)
    ),
    ADD Picklistentry hello_worldv2__c(
        value('New Value'),
        order(1),
        active(true)
    )
);
```

---

## MDL Operators

### Logical Operators
*   **IF EXISTS**: Skips processing if the component does not exist.
*   **IF NOT EXISTS**: Skips processing if the component already exists.

Example:
```sql
ALTER Object IF EXISTS my_object__c (
    ADD Field IF NOT EXISTS my_field__c (
        label('My Field'),
        type('String'),
        active(true)
    )
);
```

---

## Common Use Cases

### 1. Alter Multiple Components
Update attributes across multiple components in a single script:
```sql
ALTER Notificationtemplate my_template1__c ( subject('Subject 1') );
ALTER Notificationtemplate my_template2__c ( subject('Subject 2') );
```

### 2. Migrate Configuration
Retrieve a `RECREATE` command from a source Vault and execute it on a target Vault.
*   **Retrieve**: `GET /api/mdl/components/{component_name}`
*   **Execute**: `POST /api/mdl/execute`

### 3. Access Control
Manage `Atomicsecurity` and `Sharingrule` components programmatically to handle complex security requirements across many objects or states.

---

## Component Directory & Querying
Vault de-normalizes component records into a queryable object: `vault_component__v`.
You can use **VQL** to find components:
```sql
SELECT name__v, component_name__v, component_type__v 
FROM vault_component__v 
WHERE component_type__v = 'Object'
```

---

## Web Sections
Web sections (iframes) can **only** be created using MDL within the `page_markup` attribute of a `Pagelayout`.

Example XML within MDL:
```xml
<vault:section title="References" name="references__c">
    <vault:websection 
        is_post_session="false" 
        section_height="500px" 
        view_mode_url="https://developer.veevavault.com/mdl" />
</vault:section>
```

---

## Picklist Management

### Reordering Picklist Values
Set `order_type` to `order_asc__sys` and modify the `order()` attribute of entries:
```sql
ALTER Picklist study_ownership__c (
    MODIFY Picklistentry first_item__c ( order(0) ),
    MODIFY Picklistentry second_item__c ( order(1) )
);
```

### Picklist Dependencies
Define controlling fields and dependent value matrices:
```sql
ALTER Object product__v (
    MODIFY Field language__c (
        controlling_picklist('region__c'),
        picklist_dependencies('{"emea__c":["english__c"],"apac__c":["chinese__c","japanese__c"]}')
    )
);
```
