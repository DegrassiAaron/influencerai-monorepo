# ComfyUI Workflow Templates - BDD Scenarios
# Issue #176: ComfyUI workflow JSON templates for image generation with LoRA support

# ==============================================================================
# FEATURE 1: Workflow Builder Functions
# ==============================================================================

Feature: Basic Image Generation Workflow
  As a worker job processor
  I want to build a basic text-to-image workflow without LoRAs
  So that I can generate images using a base checkpoint model

Background:
  Given the ComfyUI workflow builder is initialized
  And a valid base checkpoint model exists at "models/checkpoints/realisticVisionV51.safetensors"

Scenario: Build basic workflow with minimal parameters
  Given I have workflow parameters:
    | parameter  | value                          |
    | prompt     | "a beautiful sunset over ocean" |
    | checkpoint | "realisticVisionV51.safetensors" |
  When I call buildBasicWorkflow(params)
  Then a workflow object is returned
  And the workflow contains a CheckpointLoaderSimple node
  And the workflow contains a CLIPTextEncode node for positive prompt
  And the workflow contains a CLIPTextEncode node for negative prompt
  And the workflow contains a KSampler node
  And the workflow contains a VAEDecode node
  And the workflow contains a SaveImage node
  And all nodes are correctly connected via node IDs

Scenario: Build basic workflow with all optional parameters
  Given I have workflow parameters:
    | parameter      | value                               |
    | prompt         | "portrait of a woman, detailed"     |
    | negativePrompt | "blurry, low quality"               |
    | checkpoint     | "realisticVisionV51.safetensors"    |
    | width          | 768                                 |
    | height         | 1024                                |
    | steps          | 30                                  |
    | cfg            | 7.5                                 |
    | seed           | 42                                  |
    | sampler        | "euler_ancestral"                   |
    | scheduler      | "karras"                            |
  When I call buildBasicWorkflow(params)
  Then the KSampler node uses width 768 and height 1024
  And the KSampler node uses 30 steps
  And the KSampler node uses CFG scale 7.5
  And the KSampler node uses seed 42
  And the KSampler node uses sampler "euler_ancestral"
  And the KSampler node uses scheduler "karras"

Scenario: Build basic workflow with default values
  Given I have minimal workflow parameters:
    | parameter  | value                          |
    | prompt     | "test prompt"                   |
    | checkpoint | "model.safetensors"            |
  When I call buildBasicWorkflow(params)
  Then the KSampler node uses default width 512
  And the KSampler node uses default height 512
  And the KSampler node uses default steps 20
  And the KSampler node uses default CFG scale 7.0
  And the KSampler node uses a random seed
  And the negative prompt is "low quality, blurry, distorted"

Scenario: Workflow generates unique node IDs
  Given I build a workflow with prompt "test 1"
  And I build another workflow with prompt "test 2"
  When I compare the two workflows
  Then each workflow has unique node IDs
  And node IDs do not conflict between workflows

# ==============================================================================

Feature: Single LoRA Workflow
  As a worker job processor
  I want to build a workflow with a single LoRA model
  So that I can generate images with a specific trained style or character

Background:
  Given the ComfyUI workflow builder is initialized
  And a valid checkpoint exists at "models/checkpoints/base.safetensors"
  And a valid LoRA exists at "models/loras/influencer-style-v1.safetensors"

Scenario: Build workflow with one LoRA at default strength
  Given I have workflow parameters:
    | parameter  | value                                      |
    | prompt     | "portrait in studio lighting"              |
    | checkpoint | "base.safetensors"                         |
    | loras      | [{ path: "influencer-style-v1.safetensors" }] |
  When I call buildLoRAWorkflow(params)
  Then the workflow contains a CheckpointLoaderSimple node
  And the workflow contains a LoraLoader node
  And the LoraLoader node connects to the CheckpointLoaderSimple MODEL output
  And the LoraLoader node connects to the CheckpointLoaderSimple CLIP output
  And the LoraLoader node uses strength_model 1.0
  And the LoraLoader node uses strength_clip 1.0
  And the CLIPTextEncode nodes connect to the LoraLoader CLIP output
  And the KSampler node connects to the LoraLoader MODEL output

Scenario: Build workflow with one LoRA at custom strength
  Given I have workflow parameters:
    | parameter  | value                                                              |
    | prompt     | "portrait"                                                         |
    | checkpoint | "base.safetensors"                                                 |
    | loras      | [{ path: "influencer.safetensors", strengthModel: 0.8, strengthClip: 0.6 }] |
  When I call buildLoRAWorkflow(params)
  Then the LoraLoader node uses strength_model 0.8
  And the LoraLoader node uses strength_clip 0.6

Scenario: Build workflow with LoRA using relative path
  Given I have workflow parameters:
    | parameter  | value                                    |
    | prompt     | "test"                                   |
    | checkpoint | "base.safetensors"                       |
    | loras      | [{ path: "influencer/version-2.safetensors" }] |
  When I call buildLoRAWorkflow(params)
  Then the LoraLoader node uses lora_name "influencer/version-2.safetensors"
  And the workflow builds successfully

Scenario: LoRA workflow maintains all basic workflow features
  Given I have workflow parameters with LoRA:
    | parameter      | value                                      |
    | prompt         | "detailed portrait"                        |
    | negativePrompt | "cartoon"                                  |
    | checkpoint     | "base.safetensors"                         |
    | width          | 768                                        |
    | height         | 1024                                       |
    | steps          | 25                                         |
    | loras          | [{ path: "style.safetensors" }]            |
  When I call buildLoRAWorkflow(params)
  Then all parameters are correctly applied to the KSampler
  And the negative prompt is used in CLIPTextEncode
  And the SaveImage node is present

# ==============================================================================

Feature: Multi-LoRA Workflow (Stacking)
  As a worker job processor
  I want to build a workflow with multiple LoRA models stacked together
  So that I can combine multiple styles, characters, or effects

Background:
  Given the ComfyUI workflow builder is initialized
  And a valid checkpoint exists at "models/checkpoints/base.safetensors"
  And valid LoRAs exist:
    | path                    |
    | character-lora.safetensors |
    | style-lora.safetensors     |
    | lighting-lora.safetensors  |

Scenario: Build workflow with two LoRAs stacked
  Given I have workflow parameters:
    | parameter  | value                                                              |
    | prompt     | "portrait"                                                         |
    | checkpoint | "base.safetensors"                                                 |
    | loras      | [{ path: "character.safetensors" }, { path: "style.safetensors" }] |
  When I call buildLoRAWorkflow(params)
  Then the workflow contains 2 LoraLoader nodes
  And LoraLoader node 1 connects to CheckpointLoaderSimple
  And LoraLoader node 2 connects to LoraLoader node 1 outputs
  And the CLIPTextEncode nodes connect to LoraLoader node 2 CLIP output
  And the KSampler node connects to LoraLoader node 2 MODEL output

Scenario: Build workflow with three LoRAs stacked
  Given I have workflow parameters:
    | parameter  | value                                                                                        |
    | prompt     | "portrait"                                                                                   |
    | checkpoint | "base.safetensors"                                                                           |
    | loras      | [{ path: "char.safetensors" }, { path: "style.safetensors" }, { path: "light.safetensors" }] |
  When I call buildLoRAWorkflow(params)
  Then the workflow contains 3 LoraLoader nodes
  And LoraLoader nodes form a chain from checkpoint to final output
  And each LoraLoader receives MODEL and CLIP from the previous node
  And the final LoraLoader outputs connect to text encoding and sampling

Scenario: Multi-LoRA with individual strength values
  Given I have workflow parameters:
    | parameter  | value                                                                                                    |
    | prompt     | "test"                                                                                                   |
    | checkpoint | "base.safetensors"                                                                                       |
    | loras      | [{ path: "a.safetensors", strengthModel: 1.0 }, { path: "b.safetensors", strengthModel: 0.5, strengthClip: 0.7 }] |
  When I call buildLoRAWorkflow(params)
  Then LoraLoader node 1 uses strength_model 1.0 and strength_clip 1.0
  And LoraLoader node 2 uses strength_model 0.5 and strength_clip 0.7

Scenario: Empty LoRA array falls back to basic workflow
  Given I have workflow parameters:
    | parameter  | value              |
    | prompt     | "test"             |
    | checkpoint | "base.safetensors" |
    | loras      | []                 |
  When I call buildLoRAWorkflow(params)
  Then the workflow contains 0 LoraLoader nodes
  And the workflow is identical to buildBasicWorkflow output

Scenario: LoRA order is preserved in workflow
  Given I have workflow parameters:
    | parameter  | value                                                              |
    | prompt     | "test"                                                             |
    | checkpoint | "base.safetensors"                                                 |
    | loras      | [{ path: "first.safetensors" }, { path: "second.safetensors" }, { path: "third.safetensors" }] |
  When I call buildLoRAWorkflow(params)
  Then LoraLoader node 1 uses lora_name "first.safetensors"
  And LoraLoader node 2 uses lora_name "second.safetensors"
  And LoraLoader node 3 uses lora_name "third.safetensors"
  And the chain order is: checkpoint -> first -> second -> third -> samplers

# ==============================================================================

Feature: Auto-Selection of Workflow Builder
  As a worker job processor
  I want the system to automatically select the correct workflow builder
  So that I don't need to manually choose between basic and LoRA workflows

Background:
  Given the ComfyUI workflow builder is initialized

Scenario: Auto-select basic workflow when no LoRAs provided
  Given I have workflow parameters:
    | parameter  | value              |
    | prompt     | "test"             |
    | checkpoint | "base.safetensors" |
  When I call buildWorkflow(params)
  Then buildBasicWorkflow is called internally
  And the workflow contains 0 LoraLoader nodes

Scenario: Auto-select LoRA workflow when LoRAs provided
  Given I have workflow parameters:
    | parameter  | value                                    |
    | prompt     | "test"                                   |
    | checkpoint | "base.safetensors"                       |
    | loras      | [{ path: "style.safetensors" }]          |
  When I call buildWorkflow(params)
  Then buildLoRAWorkflow is called internally
  And the workflow contains LoraLoader nodes

Scenario: Auto-select handles undefined vs empty array
  Given I have workflow parameters with loras: undefined
  When I call buildWorkflow(params)
  Then buildBasicWorkflow is called

  Given I have workflow parameters with loras: []
  When I call buildWorkflow(params)
  Then buildBasicWorkflow is called

# ==============================================================================
# FEATURE 2: Workflow Validation
# ==============================================================================

Feature: Workflow Structure Validation
  As a workflow builder
  I want to validate workflow structure before submission
  So that invalid workflows are caught early with clear error messages

Background:
  Given the ComfyUI workflow validator is initialized

Scenario: Validate correct workflow structure
  Given I have a valid workflow:
    ```json
    {
      "1": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": { "ckpt_name": "model.safetensors" }
      },
      "2": {
        "class_type": "CLIPTextEncode",
        "inputs": { "text": "test", "clip": ["1", 1] }
      }
    }
    ```
  When I call validateWorkflow(workflow)
  Then validation passes
  And no errors are returned

Scenario: Detect missing required node fields
  Given I have a workflow with a node missing class_type:
    ```json
    {
      "1": {
        "inputs": { "ckpt_name": "model.safetensors" }
      }
    }
    ```
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message is "Node 1: Missing required field 'class_type'"

Scenario: Detect missing required node inputs
  Given I have a workflow with a CheckpointLoaderSimple missing ckpt_name:
    ```json
    {
      "1": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {}
      }
    }
    ```
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message contains "Node 1 (CheckpointLoaderSimple): Missing required input 'ckpt_name'"

Scenario: Detect invalid node class_type
  Given I have a workflow with unknown class_type:
    ```json
    {
      "1": {
        "class_type": "InvalidNodeType",
        "inputs": {}
      }
    }
    ```
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message is "Node 1: Unknown class_type 'InvalidNodeType'"

Scenario: Validate empty workflow
  Given I have an empty workflow: {}
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message is "Workflow must contain at least one node"

Scenario: Validate workflow with all required node types
  Given I have a complete workflow with:
    | node_type              |
    | CheckpointLoaderSimple |
    | CLIPTextEncode         |
    | KSampler               |
    | VAEDecode              |
    | SaveImage              |
  When I call validateWorkflow(workflow)
  Then validation passes
  And no required nodes are missing

Scenario: Detect missing critical nodes
  Given I have a workflow without a SaveImage node
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message is "Workflow must contain a SaveImage node"

# ==============================================================================

Feature: Workflow Connection Validation
  As a workflow builder
  I want to validate node connections and references
  So that workflows don't have broken links or dangling references

Background:
  Given the ComfyUI workflow validator is initialized

Scenario: Validate correct node references
  Given I have a workflow where node 2 references node 1:
    ```json
    {
      "1": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "model.safetensors" } },
      "2": { "class_type": "CLIPTextEncode", "inputs": { "text": "test", "clip": ["1", 1] } }
    }
    ```
  When I call validateWorkflow(workflow)
  Then validation passes
  And connection from node 2 to node 1 is valid

Scenario: Detect reference to non-existent node
  Given I have a workflow where node 2 references non-existent node 99:
    ```json
    {
      "1": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "model.safetensors" } },
      "2": { "class_type": "CLIPTextEncode", "inputs": { "text": "test", "clip": ["99", 1] } }
    }
    ```
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message is "Node 2: References non-existent node '99'"

Scenario: Detect invalid output slot reference
  Given I have a workflow where node 2 references invalid output slot:
    ```json
    {
      "1": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "model.safetensors" } },
      "2": { "class_type": "CLIPTextEncode", "inputs": { "text": "test", "clip": ["1", 999] } }
    }
    ```
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message contains "Node 2: Invalid output slot reference '999' for node '1'"

Scenario: Validate connection type compatibility
  Given I have a workflow connecting MODEL output to CLIP input
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message contains "Type mismatch: Cannot connect MODEL to CLIP input"

Scenario: Detect circular dependencies
  Given I have a workflow where:
    | from_node | to_node |
    | 1         | 2       |
    | 2         | 3       |
    | 3         | 1       |
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message is "Circular dependency detected: 1 -> 2 -> 3 -> 1"

Scenario: Validate all connections in multi-LoRA workflow
  Given I have a workflow with 3 stacked LoRA loaders
  When I call validateWorkflow(workflow)
  Then all LoraLoader MODEL inputs reference previous MODEL outputs
  And all LoraLoader CLIP inputs reference previous CLIP outputs
  And validation passes

# ==============================================================================

Feature: Workflow Validation Error Messages
  As a developer debugging workflows
  I want clear, actionable error messages
  So that I can quickly identify and fix issues

Scenario: Error message includes node ID and field name
  Given I have a workflow with invalid node "5"
  When validation fails on node "5" field "ckpt_name"
  Then error message is "Node 5: Missing required input 'ckpt_name'"

Scenario: Error message includes expected vs actual values
  Given I have a workflow with KSampler steps: -5
  When validation fails
  Then error message is "Node 3 (KSampler): Field 'steps' must be >= 1, got -5"

Scenario: Multiple validation errors are accumulated
  Given I have a workflow with:
    | error_type              |
    | missing class_type      |
    | invalid node reference  |
    | missing required input  |
  When I call validateWorkflow(workflow)
  Then validation fails
  And error message contains all 3 errors
  And each error is on a separate line

Scenario: Validation error includes path to nested field
  Given I have a workflow with invalid nested input
  When validation fails on nested field
  Then error message is "Node 2: inputs.clip[0] references non-existent node '99'"

# ==============================================================================
# FEATURE 3: Node Factory
# ==============================================================================

Feature: Node Factory - CheckpointLoaderSimple
  As a workflow builder
  I want to create CheckpointLoaderSimple nodes with type safety
  So that I can load base models correctly

Scenario: Create CheckpointLoaderSimple with valid checkpoint
  Given I have checkpoint name "realisticVisionV51.safetensors"
  When I call createCheckpointLoaderNode(nodeId: "1", ckptName: "realisticVisionV51.safetensors")
  Then a node is returned with:
    | field      | value                              |
    | id         | "1"                                |
    | class_type | "CheckpointLoaderSimple"           |
    | inputs     | { ckpt_name: "realisticVisionV51.safetensors" } |

Scenario: CheckpointLoader outputs are correctly defined
  Given I create a CheckpointLoaderSimple node with id "1"
  When I query the node outputs
  Then output slot 0 is type "MODEL"
  And output slot 1 is type "CLIP"
  And output slot 2 is type "VAE"

Scenario: Reject empty checkpoint name
  When I call createCheckpointLoaderNode(nodeId: "1", ckptName: "")
  Then an error is thrown
  And error message is "Checkpoint name cannot be empty"

# ==============================================================================

Feature: Node Factory - LoraLoader
  As a workflow builder
  I want to create LoraLoader nodes with type safety
  So that I can apply LoRA models with correct connections

Scenario: Create LoraLoader with default strengths
  Given I have LoRA config:
    | field | value                  |
    | path  | "influencer-v1.safetensors" |
  When I call createLoraLoaderNode(nodeId: "2", loraConfig, modelFrom: ["1", 0], clipFrom: ["1", 1])
  Then a node is returned with:
    | field      | value                           |
    | id         | "2"                             |
    | class_type | "LoraLoader"                    |
    | inputs     | { lora_name: "influencer-v1.safetensors", strength_model: 1.0, strength_clip: 1.0, model: ["1", 0], clip: ["1", 1] } |

Scenario: Create LoraLoader with custom strengths
  Given I have LoRA config:
    | field         | value                  |
    | path          | "style.safetensors"    |
    | strengthModel | 0.8                    |
    | strengthClip  | 0.6                    |
  When I call createLoraLoaderNode(nodeId: "3", loraConfig, modelFrom: ["2", 0], clipFrom: ["2", 1])
  Then the node inputs contain:
    | field          | value |
    | strength_model | 0.8   |
    | strength_clip  | 0.6   |

Scenario: LoraLoader outputs are correctly defined
  Given I create a LoraLoader node
  When I query the node outputs
  Then output slot 0 is type "MODEL"
  And output slot 1 is type "CLIP"

Scenario: Reject invalid strength values
  When I call createLoraLoaderNode with strengthModel: -0.5
  Then an error is thrown
  And error message contains "strength_model must be between 0 and 2"

  When I call createLoraLoaderNode with strengthModel: 3.0
  Then an error is thrown
  And error message contains "strength_model must be between 0 and 2"

# ==============================================================================

Feature: Node Factory - CLIPTextEncode
  As a workflow builder
  I want to create CLIPTextEncode nodes with type safety
  So that I can encode prompts correctly

Scenario: Create positive prompt encoder
  Given I have prompt "beautiful sunset, detailed, 8k"
  When I call createCLIPTextEncodeNode(nodeId: "4", text: prompt, clipFrom: ["1", 1])
  Then a node is returned with:
    | field      | value                                      |
    | id         | "4"                                        |
    | class_type | "CLIPTextEncode"                           |
    | inputs     | { text: "beautiful sunset, detailed, 8k", clip: ["1", 1] } |

Scenario: Create negative prompt encoder
  Given I have negative prompt "blurry, low quality, distorted"
  When I call createCLIPTextEncodeNode(nodeId: "5", text: negativePrompt, clipFrom: ["1", 1])
  Then the node inputs.text is "blurry, low quality, distorted"

Scenario: CLIPTextEncode output is CONDITIONING
  Given I create a CLIPTextEncode node
  When I query the node outputs
  Then output slot 0 is type "CONDITIONING"

Scenario: Allow empty prompt (edge case)
  When I call createCLIPTextEncodeNode(nodeId: "4", text: "", clipFrom: ["1", 1])
  Then the node is created successfully
  And inputs.text is ""

# ==============================================================================

Feature: Node Factory - KSampler
  As a workflow builder
  I want to create KSampler nodes with type safety and validation
  So that I can configure image generation correctly

Scenario: Create KSampler with all parameters
  Given I have sampler config:
    | field        | value             |
    | seed         | 42                |
    | steps        | 25                |
    | cfg          | 7.5               |
    | sampler_name | "euler_ancestral" |
    | scheduler    | "karras"          |
    | denoise      | 1.0               |
    | width        | 768               |
    | height       | 1024              |
  When I call createKSamplerNode(nodeId: "6", config, modelFrom, positiveFrom, negativeFrom, latentFrom)
  Then a node is returned with all config values in inputs
  And inputs.seed is 42
  And inputs.steps is 25
  And inputs.cfg is 7.5
  And inputs.sampler_name is "euler_ancestral"

Scenario: KSampler with default values
  Given I have minimal sampler config with only required connections
  When I call createKSamplerNode(nodeId: "6", config, connections)
  Then inputs.seed is a random integer
  And inputs.steps is 20
  And inputs.cfg is 7.0
  And inputs.sampler_name is "euler"
  And inputs.scheduler is "normal"
  And inputs.denoise is 1.0

Scenario: Validate steps range
  When I call createKSamplerNode with steps: 0
  Then an error is thrown
  And error message is "steps must be >= 1"

  When I call createKSamplerNode with steps: 151
  Then an error is thrown
  And error message is "steps must be <= 150"

Scenario: Validate CFG scale range
  When I call createKSamplerNode with cfg: -1
  Then an error is thrown
  And error message contains "cfg must be >= 0"

  When I call createKSamplerNode with cfg: 31
  Then an error is thrown
  And error message contains "cfg must be <= 30"

Scenario: Validate denoise range
  When I call createKSamplerNode with denoise: 1.5
  Then an error is thrown
  And error message is "denoise must be between 0 and 1"

Scenario: Validate sampler name enum
  When I call createKSamplerNode with sampler_name: "invalid_sampler"
  Then an error is thrown
  And error message contains "Invalid sampler_name"

Scenario: KSampler outputs LATENT
  Given I create a KSampler node
  When I query the node outputs
  Then output slot 0 is type "LATENT"

# ==============================================================================

Feature: Node Factory - VAEDecode
  As a workflow builder
  I want to create VAEDecode nodes
  So that I can decode latent images to pixels

Scenario: Create VAEDecode node
  When I call createVAEDecodeNode(nodeId: "7", samplesFrom: ["6", 0], vaeFrom: ["1", 2])
  Then a node is returned with:
    | field      | value                                   |
    | id         | "7"                                     |
    | class_type | "VAEDecode"                             |
    | inputs     | { samples: ["6", 0], vae: ["1", 2] }    |

Scenario: VAEDecode output is IMAGE
  Given I create a VAEDecode node
  When I query the node outputs
  Then output slot 0 is type "IMAGE"

# ==============================================================================

Feature: Node Factory - SaveImage
  As a workflow builder
  I want to create SaveImage nodes
  So that I can save generated images to disk

Scenario: Create SaveImage with default prefix
  When I call createSaveImageNode(nodeId: "8", imagesFrom: ["7", 0])
  Then a node is returned with:
    | field      | value                                |
    | id         | "8"                                  |
    | class_type | "SaveImage"                          |
    | inputs     | { images: ["7", 0], filename_prefix: "ComfyUI" } |

Scenario: Create SaveImage with custom prefix
  When I call createSaveImageNode(nodeId: "8", imagesFrom: ["7", 0], filenamePrefix: "influencer-portrait")
  Then inputs.filename_prefix is "influencer-portrait"

Scenario: SaveImage has no outputs
  Given I create a SaveImage node
  When I query the node outputs
  Then the node has 0 output slots

# ==============================================================================

Feature: Node Factory - Type Safety
  As a workflow builder using TypeScript
  I want compile-time type checking on node factory functions
  So that I catch errors before runtime

Scenario: TypeScript enforces required parameters
  Given I am writing TypeScript code
  When I call createCheckpointLoaderNode without ckptName parameter
  Then TypeScript compilation fails
  And error message indicates missing required parameter

Scenario: TypeScript enforces correct connection types
  Given I am writing TypeScript code
  When I try to connect a MODEL output to a CLIP input
  Then TypeScript compilation fails
  And error message indicates type mismatch

Scenario: TypeScript autocomplete suggests valid sampler names
  Given I am writing TypeScript code in an IDE
  When I type createKSamplerNode({ sampler_name: " })
  Then autocomplete suggests: ["euler", "euler_ancestral", "heun", "dpm_2", "dpm_2_ancestral", "lms", "dpm_fast", "dpm_adaptive", "ddim"]

# ==============================================================================
# FEATURE 4: Integration with ComfyUI Client
# ==============================================================================

Feature: Build Workflow from Job Parameters
  As a BullMQ worker processing image generation jobs
  I want to build a ComfyUI workflow from job payload parameters
  So that I can submit it to the ComfyUI API

Background:
  Given a ComfyUI client is initialized
  And ComfyUI is running at "http://localhost:8188"

Scenario: Build workflow from minimal job parameters
  Given I have job parameters:
    ```json
    {
      "prompt": "portrait of a woman",
      "checkpoint": "realisticVisionV51.safetensors"
    }
    ```
  When I call buildWorkflowFromJobParams(params)
  Then a valid ComfyUI workflow is returned
  And the workflow can be serialized to JSON
  And the workflow passes validation

Scenario: Build workflow from complete job parameters
  Given I have job parameters:
    ```json
    {
      "prompt": "detailed portrait, studio lighting",
      "negativePrompt": "blurry, distorted",
      "checkpoint": "realisticVisionV51.safetensors",
      "width": 768,
      "height": 1024,
      "steps": 30,
      "cfg": 7.5,
      "seed": 12345,
      "sampler": "euler_ancestral",
      "scheduler": "karras",
      "loras": [
        { "path": "influencer-style.safetensors", "strengthModel": 0.9, "strengthClip": 0.8 }
      ]
    }
    ```
  When I call buildWorkflowFromJobParams(params)
  Then all parameters are correctly mapped to workflow nodes
  And the workflow includes 1 LoraLoader node

Scenario: Build workflow with multiple LoRAs from job params
  Given I have job parameters with 3 LoRAs
  When I call buildWorkflowFromJobParams(params)
  Then the workflow includes 3 LoraLoader nodes in correct order

Scenario: Handle missing optional parameters with defaults
  Given I have job parameters with only prompt and checkpoint
  When I call buildWorkflowFromJobParams(params)
  Then default values are used for width, height, steps, cfg
  And a random seed is generated
  And default sampler "euler" and scheduler "normal" are used

# ==============================================================================

Feature: Submit Workflow to ComfyUI API
  As a BullMQ worker
  I want to submit built workflows to the ComfyUI API
  So that images are generated

Background:
  Given a ComfyUI client is initialized
  And ComfyUI is running and healthy

Scenario: Successfully submit workflow to ComfyUI
  Given I have a valid workflow object
  When I call comfyClient.submitWorkflow(workflow)
  Then the workflow is POST to /prompt endpoint
  And a prompt_id is returned
  And the prompt_id is a non-empty string

Scenario: Submit workflow and poll for completion
  Given I have a valid workflow object
  When I call comfyClient.submitWorkflowAndWait(workflow)
  Then the workflow is submitted
  And the system polls /history/{prompt_id} endpoint
  And when status is "completed", the function resolves
  And output image paths are returned

Scenario: Handle ComfyUI API errors on submission
  Given ComfyUI is running but returns 400 Bad Request
  When I call comfyClient.submitWorkflow(workflow)
  Then an error is thrown
  And error message contains "ComfyUI API error: 400"
  And error message includes response body details

Scenario: Handle ComfyUI unavailable
  Given ComfyUI is not running at the configured URL
  When I call comfyClient.submitWorkflow(workflow)
  Then an error is thrown
  And error message is "ComfyUI is not reachable at http://localhost:8188"

Scenario: Retry submission on transient errors
  Given ComfyUI returns 503 Service Unavailable on first request
  And ComfyUI returns 200 OK on second request
  When I call comfyClient.submitWorkflow(workflow, { retries: 3 })
  Then the submission is retried
  And the workflow is successfully submitted on retry
  And a prompt_id is returned

# ==============================================================================

Feature: Handle Invalid Job Parameters
  As a BullMQ worker
  I want to validate job parameters before building workflows
  So that invalid jobs fail fast with clear error messages

Scenario: Reject job with missing required parameter (prompt)
  Given I have job parameters:
    ```json
    {
      "checkpoint": "model.safetensors"
    }
    ```
  When I call buildWorkflowFromJobParams(params)
  Then an error is thrown
  And error message is "Missing required parameter: prompt"

Scenario: Reject job with missing required parameter (checkpoint)
  Given I have job parameters:
    ```json
    {
      "prompt": "test"
    }
    ```
  When I call buildWorkflowFromJobParams(params)
  Then an error is thrown
  And error message is "Missing required parameter: checkpoint"

Scenario: Reject job with invalid parameter types
  Given I have job parameters:
    ```json
    {
      "prompt": "test",
      "checkpoint": "model.safetensors",
      "steps": "twenty"
    }
    ```
  When I call buildWorkflowFromJobParams(params)
  Then an error is thrown
  And error message contains "steps must be a number"

Scenario: Reject job with out-of-range values
  Given I have job parameters:
    ```json
    {
      "prompt": "test",
      "checkpoint": "model.safetensors",
      "cfg": 50
    }
    ```
  When I call buildWorkflowFromJobParams(params)
  Then an error is thrown
  And error message is "cfg must be between 0 and 30"

Scenario: Reject job with invalid LoRA structure
  Given I have job parameters with loras:
    ```json
    {
      "loras": [
        { "strengthModel": 0.8 }
      ]
    }
    ```
  When I call buildWorkflowFromJobParams(params)
  Then an error is thrown
  And error message contains "loras[0].path is required"

# ==============================================================================

Feature: Workflow Serialization for API Submission
  As a ComfyUI client
  I want to serialize workflow objects to JSON correctly
  So that ComfyUI can parse them

Scenario: Serialize basic workflow to ComfyUI JSON format
  Given I have built a basic workflow
  When I call workflow.toJSON()
  Then the output is valid JSON
  And the JSON structure matches ComfyUI's expected format
  And node IDs are string keys at the top level
  And each node has class_type and inputs fields

Scenario: Serialize multi-LoRA workflow maintains order
  Given I have built a workflow with 3 LoRAs
  When I call workflow.toJSON()
  Then the LoraLoader nodes appear in the correct order
  And connections between nodes are preserved

Scenario: Serialized workflow is idempotent
  Given I have built a workflow
  When I serialize it twice
  Then both JSON outputs are identical

# ==============================================================================
# FEATURE 5: LoRA Path Resolution
# ==============================================================================

Feature: LoRA Local File Path Resolution
  As a workflow builder
  I want to resolve LoRA file paths correctly
  So that ComfyUI can find the LoRA models

Background:
  Given the LoRA path resolver is initialized
  And ComfyUI models directory is at "/app/ComfyUI/models"

Scenario: Resolve absolute path to relative path
  Given I have LoRA path "/app/ComfyUI/models/loras/influencer-v1.safetensors"
  When I call resolveLoraPath(path)
  Then the resolved path is "influencer-v1.safetensors"

Scenario: Resolve nested subdirectory path
  Given I have LoRA path "/app/ComfyUI/models/loras/characters/influencer/v2.safetensors"
  When I call resolveLoraPath(path)
  Then the resolved path is "characters/influencer/v2.safetensors"

Scenario: Handle already relative path
  Given I have LoRA path "style-lora.safetensors"
  When I call resolveLoraPath(path)
  Then the resolved path is "style-lora.safetensors"

Scenario: Handle Windows-style paths
  Given I have LoRA path "C:\\ComfyUI\\models\\loras\\influencer.safetensors"
  And the platform is Windows
  When I call resolveLoraPath(path)
  Then the resolved path is "influencer.safetensors"

Scenario: Preserve subdirectory structure in relative paths
  Given I have LoRA path "characters/female/influencer.safetensors"
  When I call resolveLoraPath(path)
  Then the resolved path is "characters/female/influencer.safetensors"

# ==============================================================================

Feature: Handle Missing LoRA Files
  As a workflow builder
  I want to detect missing LoRA files before submission
  So that jobs fail early with clear error messages

Background:
  Given the LoRA path resolver is initialized
  And LoRA base directory is "/app/ComfyUI/models/loras"

Scenario: Validate existing LoRA file
  Given a LoRA file exists at "/app/ComfyUI/models/loras/influencer-v1.safetensors"
  When I call validateLoraPath("influencer-v1.safetensors")
  Then validation passes
  And no error is thrown

Scenario: Detect missing LoRA file
  Given no LoRA file exists at "/app/ComfyUI/models/loras/nonexistent.safetensors"
  When I call validateLoraPath("nonexistent.safetensors")
  Then an error is thrown
  And error message is "LoRA file not found: nonexistent.safetensors"

Scenario: Detect missing LoRA in subdirectory
  Given no LoRA file exists at "/app/ComfyUI/models/loras/characters/missing.safetensors"
  When I call validateLoraPath("characters/missing.safetensors")
  Then an error is thrown
  And error message is "LoRA file not found: characters/missing.safetensors"

Scenario: Validate all LoRAs before building workflow
  Given I have job parameters with 3 LoRAs
  And LoRA 2 does not exist
  When I call buildWorkflowFromJobParams(params)
  Then an error is thrown before workflow construction
  And error message identifies the missing LoRA file
  And error message is "LoRA file not found: missing-lora.safetensors"

Scenario: Skip validation when validation is disabled (performance)
  Given I have job parameters with a non-existent LoRA
  When I call buildWorkflowFromJobParams(params, { validateLoras: false })
  Then the workflow is built successfully
  And no file validation is performed

# ==============================================================================

Feature: LoRA Path Configuration
  As a system administrator
  I want to configure the LoRA models directory
  So that the system works in different environments

Scenario: Use default LoRA directory
  Given no COMFYUI_LORAS_DIR environment variable is set
  When the path resolver is initialized
  Then the LoRA directory is "/app/ComfyUI/models/loras"

Scenario: Use custom LoRA directory from environment
  Given COMFYUI_LORAS_DIR is set to "/custom/lora/path"
  When the path resolver is initialized
  Then the LoRA directory is "/custom/lora/path"

Scenario: Handle trailing slashes in directory path
  Given COMFYUI_LORAS_DIR is set to "/custom/lora/path/"
  When the path resolver is initialized
  Then the LoRA directory is "/custom/lora/path" (without trailing slash)

Scenario: Resolve paths relative to custom directory
  Given COMFYUI_LORAS_DIR is set to "/custom/loras"
  And a LoRA file exists at "/custom/loras/style.safetensors"
  When I call validateLoraPath("style.safetensors")
  Then validation passes

# ==============================================================================

Feature: LoRA File Extension Validation
  As a workflow builder
  I want to validate LoRA file extensions
  So that only valid LoRA files are used

Scenario: Accept .safetensors extension
  When I call validateLoraExtension("model.safetensors")
  Then validation passes

Scenario: Accept .pt extension (legacy)
  When I call validateLoraExtension("model.pt")
  Then validation passes

Scenario: Accept .ckpt extension (legacy)
  When I call validateLoraExtension("model.ckpt")
  Then validation passes

Scenario: Reject invalid extension
  When I call validateLoraExtension("model.txt")
  Then an error is thrown
  And error message is "Invalid LoRA file extension. Must be .safetensors, .pt, or .ckpt"

Scenario: Reject missing extension
  When I call validateLoraExtension("model")
  Then an error is thrown
  And error message contains "Invalid LoRA file extension"
