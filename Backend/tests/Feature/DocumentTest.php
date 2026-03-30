<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctor;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->doctor = User::factory()->doctor()->create(['status' => 'actif']);
        $this->doctor->assignRole('doctor');

        $this->admin = User::factory()->create(['status' => 'actif']);
        $this->admin->assignRole('admin');
    }

    public function test_list_documents(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->getJson('/api/v1/documents');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_upload_document(): void
    {
        Storage::fake('local');

        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/documents', [
                'file' => UploadedFile::fake()->create('report.pdf', 500, 'application/pdf'),
                'titre' => 'Compte-rendu',
                'description' => 'CR de consultation',
                'niveau_confidentialite' => 'normal',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    public function test_upload_validates_file(): void
    {
        $response = $this->actingAs($this->doctor, 'api')
            ->postJson('/api/v1/documents', [
                'titre' => 'Sans fichier',
            ]);

        // Missing 'file' field → 422 validation error
        $response->assertStatus(422);
    }

    public function test_delete_document(): void
    {
        Storage::fake('local');

        $doc = Document::create([
            'titre' => 'Test Doc',
            'chemin_fichier' => 'documents/test.pdf',
            'nom_fichier_original' => 'test.pdf',
            'type_mime' => 'application/pdf',
            'taille_octets' => 1024,
            'niveau_confidentialite' => 'normal',
            'user_id' => $this->doctor->id,
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/v1/documents/{$doc->id}");

        $response->assertOk();
    }

    public function test_documents_require_auth(): void
    {
        $this->getJson('/api/v1/documents')->assertStatus(401);
    }
}
