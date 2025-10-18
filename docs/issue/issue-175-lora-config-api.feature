# Feature: LoRA Config API
# Issue: #175
# Description: CRUD API for managing LoRA training configuration templates

Feature: LoRA Config Management API
  As a tenant user
  I want to create, manage, and reuse LoRA training configurations
  So that I can apply proven training parameters to new datasets without manual re-entry

  Background:
    Given I am authenticated as a tenant user
    And the database has been migrated with LoraConfig model
    And the system enforces multi-tenant isolation

  # CREATE scenarios
  Scenario: Create a new LoRA config with valid parameters
    Given I have valid LoRA training parameters:
      | name            | SD 1.5 Portrait Training    |
      | description     | Optimized for portrait photos|
      | modelName       | runwayml/stable-diffusion-v1-5 |
      | epochs          | 10                          |
      | learningRate    | 0.0001                      |
      | batchSize       | 1                           |
      | resolution      | 512                         |
      | networkDim      | 32                          |
      | networkAlpha    | 16                          |
    When I POST to /lora-configs with these parameters
    Then I should receive a 201 Created response
    And the response should include a config ID
    And the response should match the input parameters
    And the config should be stored with my tenant ID

  Scenario: Create config with duplicate name fails
    Given a LoRA config exists with name "SD 1.5 Standard"
    When I POST to /lora-configs with name "SD 1.5 Standard"
    Then I should receive a 400 Bad Request response
    And the error message should indicate duplicate name

  Scenario: Create config with invalid parameters fails
    Given I have invalid parameters:
      | epochs       | -5        |
      | learningRate | 10.0      |
      | resolution   | 128       |
    When I POST to /lora-configs with these parameters
    Then I should receive a 400 Bad Request response
    And the error should list all validation failures

  Scenario: Create config as default unsets previous default
    Given a LoRA config exists with isDefault=true
    When I POST to /lora-configs with isDefault=true
    Then I should receive a 201 Created response
    And the new config should have isDefault=true
    And the previous default config should have isDefault=false
    And only one config for my tenant should have isDefault=true

  # LIST scenarios
  Scenario: List all LoRA configs for current tenant
    Given I have 3 LoRA configs in my tenant
    And another tenant has 5 LoRA configs
    When I GET /lora-configs
    Then I should receive a 200 OK response
    And the response should contain exactly 3 configs
    And all configs should belong to my tenant
    And the response should include x-total-count header with value 3

  Scenario: List configs with pagination
    Given I have 25 LoRA configs in my tenant
    When I GET /lora-configs?take=10&skip=0
    Then I should receive 10 configs
    And the x-total-count header should be 25
    When I GET /lora-configs?take=10&skip=10
    Then I should receive 10 different configs
    When I GET /lora-configs?take=10&skip=20
    Then I should receive 5 configs

  Scenario: Filter configs by isDefault
    Given I have 5 LoRA configs with 1 marked as default
    When I GET /lora-configs?isDefault=true
    Then I should receive exactly 1 config
    And that config should have isDefault=true

  Scenario: Filter configs by modelName
    Given I have configs for:
      | modelName                       | count |
      | runwayml/stable-diffusion-v1-5  | 3     |
      | stabilityai/stable-diffusion-xl | 2     |
    When I GET /lora-configs?modelName=runwayml/stable-diffusion-v1-5
    Then I should receive 3 configs
    And all configs should have modelName "runwayml/stable-diffusion-v1-5"

  Scenario: Sort configs by createdAt descending (default)
    Given I have 3 LoRA configs created in sequence
    When I GET /lora-configs
    Then the configs should be ordered by createdAt descending

  Scenario: Sort configs by name ascending
    Given I have configs named ["Zebra", "Alpha", "Mike"]
    When I GET /lora-configs?sortBy=name&sortOrder=asc
    Then the configs should be ordered ["Alpha", "Mike", "Zebra"]

  # GET BY ID scenarios
  Scenario: Retrieve config by ID
    Given a LoRA config exists with ID "cfg_123"
    When I GET /lora-configs/cfg_123
    Then I should receive a 200 OK response
    And the response should contain the full config details

  Scenario: Retrieve non-existent config returns 404
    When I GET /lora-configs/nonexistent_id
    Then I should receive a 404 Not Found response

  Scenario: Retrieve config from different tenant returns 404
    Given a LoRA config exists in tenant "other_tenant" with ID "cfg_other"
    When I GET /lora-configs/cfg_other
    Then I should receive a 404 Not Found response
    And the response should NOT reveal tenant mismatch (security)

  # UPDATE scenarios
  Scenario: Update config with valid changes
    Given a LoRA config exists with ID "cfg_123"
    When I PATCH /lora-configs/cfg_123 with:
      | epochs       | 20    |
      | learningRate | 0.00005 |
    Then I should receive a 200 OK response
    And the config should have epochs=20
    And the config should have learningRate=0.00005
    And other fields should remain unchanged
    And updatedAt timestamp should be updated

  Scenario: Update config to set as default unsets previous default
    Given two LoRA configs exist:
      | id      | isDefault |
      | cfg_1   | true      |
      | cfg_2   | false     |
    When I PATCH /lora-configs/cfg_2 with isDefault=true
    Then cfg_2 should have isDefault=true
    And cfg_1 should have isDefault=false

  Scenario: Update config with duplicate name fails
    Given two configs exist:
      | id    | name          |
      | cfg_1 | Config Alpha  |
      | cfg_2 | Config Beta   |
    When I PATCH /lora-configs/cfg_2 with name="Config Alpha"
    Then I should receive a 400 Bad Request response
    And the error should indicate duplicate name

  Scenario: Update config from different tenant returns 404
    Given a config exists in different tenant with ID "cfg_other"
    When I PATCH /lora-configs/cfg_other with any data
    Then I should receive a 404 Not Found response

  # DELETE scenarios
  Scenario: Delete unused config succeeds
    Given a LoRA config exists with ID "cfg_123"
    And no jobs reference this config
    When I DELETE /lora-configs/cfg_123
    Then I should receive a 200 OK response
    And the config should be deleted from database
    And subsequent GET /lora-configs/cfg_123 should return 404

  Scenario: Delete default config succeeds with warning
    Given a LoRA config exists with ID "cfg_default" and isDefault=true
    And no jobs reference this config
    When I DELETE /lora-configs/cfg_default
    Then I should receive a 200 OK response
    And the response should include a warning about deleting default config
    And the config should be deleted from database

  Scenario: Delete config used by active job fails
    Given a LoRA config exists with ID "cfg_123"
    And 2 jobs exist with status "pending" using configId "cfg_123"
    When I DELETE /lora-configs/cfg_123
    Then I should receive a 400 Bad Request response
    And the error should indicate active jobs are using this config
    And the config should NOT be deleted

  Scenario: Delete config used only by completed jobs succeeds
    Given a LoRA config exists with ID "cfg_123"
    And 5 jobs exist with status "completed" using configId "cfg_123"
    When I DELETE /lora-configs/cfg_123
    Then I should receive a 200 OK response
    And the config should be deleted

  Scenario: Delete config from different tenant returns 404
    Given a config exists in different tenant with ID "cfg_other"
    When I DELETE /lora-configs/cfg_other
    Then I should receive a 404 Not Found response

  # WORKER INTEGRATION scenarios
  Scenario: Worker fetches config via API
    Given a LoRA config exists with ID "cfg_123"
    When the worker calls GET /lora-configs/cfg_123
    Then the response should include all training parameters
    And the response should match LoRAConfig schema from core-schemas
    And the worker can construct training command from response

  Scenario: Worker handles config not found gracefully
    When the worker calls GET /lora-configs/nonexistent_id
    Then the response should be 404 Not Found
    And the worker should fail the job with clear error message
    And the job should be marked as non-retriable

  # SEED DATA scenarios
  Scenario: Seed migration creates default configs
    Given a fresh database with LoraConfig table
    When the seed migration runs
    Then 3 default configs should be created:
      | name                    | modelName                      | resolution | epochs |
      | SD 1.5 Standard         | runwayml/stable-diffusion-v1-5 | 512        | 10     |
      | SD 1.5 High Quality     | runwayml/stable-diffusion-v1-5 | 768        | 20     |
      | SDXL Standard           | stabilityai/stable-diffusion-xl| 1024       | 8      |
    And all should have valid default hyperparameters

  # MULTI-TENANCY SECURITY scenarios
  Scenario: Prisma middleware automatically scopes queries
    Given the LoraConfig model is registered in modelsWithTenant
    And I am authenticated with tenantId "tenant_1"
    When any Prisma query runs on LoraConfig
    Then the where clause should automatically include tenantId="tenant_1"
    And create operations should automatically set tenantId="tenant_1"

  Scenario: Attempting SQL injection fails safely
    When I POST /lora-configs with malformed input:
      | name | '; DROP TABLE LoraConfig; -- |
    Then the request should be safely parameterized
    And no SQL injection should occur
    And the config name should be stored as literal string

  # OPENAPI DOCUMENTATION scenarios
  Scenario: All endpoints have OpenAPI documentation
    Given the OpenAPI spec is generated
    Then all 5 LoRA config endpoints should be documented
    And each endpoint should have summary and description
    And all request/response schemas should be defined
    And all error codes (400, 401, 404, 409) should be documented

  # EXTENSIBILITY scenarios
  Scenario: Store experimental parameters in meta field
    Given I want to test custom parameters
    When I POST /lora-configs with:
      | name         | Experimental Config |
      | epochs       | 10                 |
      | meta         | {"customParam": "value", "experimental": true} |
    Then the config should be created
    And meta.customParam should be stored as JSONB
    And the meta field should be retrievable in future queries

  Scenario: Future migration can add columns without breaking
    Given configs exist with data in meta field
    When a migration adds a new column "networkModule"
    Then existing configs should remain valid
    And new configs can use both column and meta
    And no data loss should occur
