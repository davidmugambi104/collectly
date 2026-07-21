#!/usr/bin/env perl
# Pass 3: explicit string replacement for known patterns.

use strict;
use warnings;

my @files = (
    'src/components/marketing/waitlist.tsx',
    'src/components/marketing/footer.tsx',
    'src/components/dev-auth-form.tsx',
    'src/components/payment/payment-form.tsx',
    'src/app/contact/page.tsx',
    'src/app/security/page.tsx',
    'src/app/dpa/page.tsx',
    'src/app/pay/[id]/page.tsx',
    'src/app/api/lead-notify/route.ts',
    'src/app/dashboard/billing/page.tsx',
    'src/lib/auth-helpers.ts',
    'src/lib/bootstrap-db.ts',
    'src/lib/infra.ts',
    'src/lib/posts.ts',
    'launch/g2/SUBMIT.md',
    'launch/capterra/SUBMIT.md',
    'launch/launch-day-playbook.md',
    'launch/postmortem/TEMPLATE.md',
    'launch/tweets/README.md',
);

my $updated = 0;
for my $f (@files) {
    next unless -e $f;
    open(my $in, '<', $f) or next;
    local $/;
    my $before = <$in>;
    close $in;

    my $after = $before;

    # Template-literal mailto: ${var}@collectly.app
    $after =~ s/(\$\{[a-zA-Z0-9_.]+\})@collectly\.app/$1\@getcollectly.app/g;

    # Literal mailto: x@collectly.app
    $after =~ s/([a-zA-Z0-9._-]+)@collectly\.app/$1\@getcollectly.app/g;

    # Bare collectly.app in text contexts (preceded by non-domain char)
    $after =~ s/(\A|[\s"',.:;!?\(\{])collectly\.app\b/$1getcollectly.app/g;

    if ($before ne $after) {
        open(my $out, '>', $f) or next;
        print $out $after;
        close $out;
        $updated++;
        print "  $f\n";
    }
}
print "Pass 3 updated $updated files\n";
