using System.Text.Json;
using System.Text.Json.Serialization;

namespace AGUI.Abstractions;

[JsonConverter(typeof(AGUIMessageJsonConverter))]
// Keep in sync with sdks/typescript/packages/core/src/types.ts
// The base carries only the fields shared by every message role (id, role). Each role
// declares its own content/name/encryptedValue exactly as the spec models them, so there
// is nothing to shadow.
public abstract class AGUIMessage
{
    [JsonPropertyName("id")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Id { get; set; }

    [JsonPropertyName("role")]
    public abstract string Role { get; }

    /// <summary>
    /// Extra information attached to this message, open by key.
    /// </summary>
    /// <remarks>
    /// Shared by every role, so it lives on the base. Any JSON value is allowed
    /// under a key, including <c>null</c>. The object itself is absent or an
    /// object, never <c>null</c>.
    ///
    /// The <c>ag-ui</c> key is reserved for AG-UI's own use; see <see
    /// cref="AGUIMetadata.ReservedKey"/>.
    /// </remarks>
    [JsonPropertyName("metadata")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public JsonElement? Metadata { get; set; }
}
